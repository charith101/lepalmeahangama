import { APP_URL } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"
import type { MetadataRoute } from "next"

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: categories } = await supabase.from("room_categories").select("id, name")
  const base = APP_URL

  const staticRoutes = [
    { url: base, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${base}/rooms`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
  ]

  const categoryRoutes = (categories || []).map((cat) => ({
    url: `${base}/rooms/${slugify(cat.name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...categoryRoutes]
}
