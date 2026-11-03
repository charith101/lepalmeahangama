import { APP_URL } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"
import { roomSlug } from "@/lib/utils"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: categories } = await supabase.from("room_categories").select("id, name")
  const base = APP_URL

  // Only indexable public pages belong here. Transactional routes
  // (/booking, /booking/lookup, /dashboard, /auth) are excluded.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/rooms`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/dine`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/experiences`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = (categories || [])
    .map((cat) => ({
      url: `${base}/rooms/${roomSlug(cat.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

  return [...staticRoutes, ...categoryRoutes]
}
