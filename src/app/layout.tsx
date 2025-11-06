import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/notion-scrollbar.css";
import SiteProvider from "@/components/providers/SiteProvider";
import { getDb } from "@/lib/mongodb";
import LayoutWrapper from "@/components/LayoutWrapper";
import GoogleTagManagerHead from "@/components/GoogleTagManagerHead";
import GoogleTagManagerBody from "@/components/GoogleTagManagerBody";
import Loading from "./Loading";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const site = await db.collection("sites").findOne({});
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site?.title || '个人博客',
    url: 'https://www.1713yjk.uk',
    logo: site?.favicon || 'https://www.1713yjk.uk/avatar.png',
    sameAs: [
      site?.social?.github || '',
      // 其他社交媒体链接
    ]
  };
  return {
    title: site?.title || "个人博客",
    description:
      site?.seo?.description || "分享技术与生活",
    keywords: site?.seo?.keywords || [],
    icons: {
      icon: site?.favicon || '/favicon.ico',
      shortcut: site?.favicon || '/favicon.ico',
      apple: site?.favicon || '/favicon.ico',
    },
    openGraph: {
      title: site?.title || '个人博客',
      siteName: site?.title || "个人博客",
      description: site?.seo?.description || "分享技术与生活",
      type: "website",
    },
    other: {
      ...site?.isOpenAdsense && site?.googleAdsenseId
        ? {
          "google-adsense-account": `ca-pub-${site.googleAdsenseId}`,
        }
        : {},
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

const jsonLdData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "个人博客",
  "url": "https://www.1713yjk.uk",
  "author": {
    "@type": "Person",
    "name": "博主"
  },
  "publisher": {
    "@type": "Organization",
    "name": "个人博客",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.1713yjk.uk/avatar.png"
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManagerHead />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={`${cn(inter.className)} h-dvh w-dvw`}>
        <SiteProvider>
          <GoogleTagManagerBody />
          <LayoutWrapper>
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </LayoutWrapper>
        </SiteProvider>
      </body>
    </html>
  );
}
