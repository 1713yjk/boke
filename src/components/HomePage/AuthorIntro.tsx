'use client'

import { useSiteStore } from "@/store/site"

export default function AuthorIntro() {
  const { site, loading } = useSiteStore()

  if (loading || !site) {
    return (
      <div className="mt-4 space-y-2">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-6 bg-gray-200 rounded animate-pulse w-full" />
      </div>
    )
  }

  return (
    <p className="text-gray-600 mt-4">
      你好 👋，我是{" "}
      <span className="bg-[#e8f5e9] px-2 py-0.5 rounded">
        {site.author?.name || '博主'}
      </span>
      ，
      {site.author?.description || '一个热爱生活和分享技术的程序员'}
    </p>
  )
}
