import { NextResponse } from "next/server";
import OSS from "ali-oss";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Check if all required environment variables are set
const requiredEnvVars = {
  region: process.env.OSS_REGION || process.env.NEXT_PUBLIC_OSS_REGION,
  accessKeyId:
    process.env.OSS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_OSS_ACCESS_KEY_ID,
  accessKeySecret:
    process.env.OSS_ACCESS_KEY_SECRET ||
    process.env.NEXT_PUBLIC_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || process.env.NEXT_PUBLIC_OSS_BUCKET,
};

// OSS 基础路径配置
const OSS_BASE_PATH = process.env.OSS_BASE_PATH || process.env.NEXT_PUBLIC_OSS_BASE_PATH || '';

// Validate environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

// 判断是否使用 OSS
const useOSS = missingEnvVars.length === 0;

if (!useOSS) {
  console.log("⚠️ OSS 配置未完整，将使用本地文件存储");
}

let client: OSS | null = null;

if (useOSS) {
  client = new OSS({
    region: requiredEnvVars.region!,
    accessKeyId: requiredEnvVars.accessKeyId!,
    accessKeySecret: requiredEnvVars.accessKeySecret!,
    bucket: requiredEnvVars.bucket!,
  });
}

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 5000, // 5秒
};

// 延迟函数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 带重试的上传函数
async function uploadWithRetry(
  client: OSS,
  filename: string,
  buffer: Buffer,
  attempt: number = 1
): Promise<OSS.PutObjectResult> {
  try {
    return await client.put(filename, buffer);
  } catch (err) {
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw err;
    }

    const delayTime = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, attempt - 1),
      RETRY_CONFIG.maxDelay
    );
    await delay(delayTime);

    return uploadWithRetry(client, filename, buffer, attempt + 1);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const directory = formData.get("directory") as string || "articles"; // 获取目录参数

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = ["text/markdown", "text/plain", "image/", "video/"];
    const isAllowedType = allowedTypes.some(type =>
      file.type.startsWith(type) || file.name.endsWith(".md")
    );

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Only markdown, image and video files are allowed" },
        { status: 400 }
      );
    }

    // 获取文件扩展名
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400 }
      );
    }

    // 根据文件类型决定存储路径
    let basePath = "articles";
    if (file.type.startsWith("image/")) {
      basePath = "images";
    } else if (file.type.startsWith("video/")) {
      basePath = "videos";
    }

    // 构建完整文件路径（包含 OSS 基础路径）
    const relativePath = `${basePath}/${directory}/${uuidv4()}.${extension}`;
    const filename = OSS_BASE_PATH ? `${OSS_BASE_PATH}/${relativePath}` : relativePath;

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());

    let url: string;

    if (useOSS && client) {
      // 上传文件到 OSS
      await uploadWithRetry(client, filename, buffer);
      url = `https://${requiredEnvVars.bucket}.${requiredEnvVars.region}.aliyuncs.com/${filename}`;
    } else {
      // 使用本地文件存储
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', basePath, directory);

      // 确保目录存在
      await mkdir(uploadDir, { recursive: true });

      // 保存文件
      const uniqueFilename = `${uuidv4()}.${extension}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      await writeFile(filePath, buffer);

      // 返回相对路径 URL
      url = `/uploads/${basePath}/${directory}/${uniqueFilename}`;
      console.log(`✅ 文件已保存到本地: ${url}`);
    }

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
