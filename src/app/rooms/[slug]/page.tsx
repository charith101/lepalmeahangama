import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { RoomDetail } from "@/components/public/RoomDetail"
import { roomSchema } from "@/lib/seo"
import { APP_URL, HOTEL_NAME } from "@/lib/constants"
import { roomSlug } from "@/lib/utils"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

// "14:00:00" (settings wall-clock value) → "2:00 PM"
function formatWallClock(value: string | null | undefined): string {
  const [h, m] = (value ?? "").split(":")
  const hour = Number(h)
  if (!h || Number.isNaN(hour)) return ""
  return `${((hour + 11) % 12) + 1}:${m || "00"} ${hour >= 12 ? "PM" : "AM"}`
}

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ")
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from("room_categories")
    .select("*")
    .ilike("name", slugToName(slug))
    .single()

  if (!category) return {}

  const title = `${category.name} Room — Le Palme Ahangama`
  // Description is a newline-separated feature list. Meta descriptions must be
  // a single short line, so flatten the first few features into one sentence.
  const features = String(category.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
  const summary = features.length
    ? features.join(" · ")
    : `${category.name} room with a private bathroom, air-conditioning, and free WiFi`
  const description = `${summary}. From $${category.base_price_usd}/night at ${HOTEL_NAME}, Ahangama.`
  const path = `/rooms/${roomSlug(category.name)}`
  const image = category.image_url as string | null

  return {
    title: `${category.name} Room`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: HOTEL_NAME,
      title,
      description,
      images: image
        ? [{ url: image, alt: `${category.name} room at ${HOTEL_NAME}` }]
        : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${HOTEL_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image || "/og-image.jpg"],
    },
  }
}

export default async function RoomDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from("room_categories")
    .select("*")
    .ilike("name", slugToName(slug))
    .single()

  if (!category) notFound()

  const { data: settings } = await supabase
    .from("settings").select("check_in_time, check_out_time").eq("id", true).maybeSingle()

  const checkInTime = formatWallClock(settings?.check_in_time)
  const checkOutTime = formatWallClock(settings?.check_out_time)
  const stayTimes = [
    checkInTime && `Check-in from ${checkInTime}`,
    checkOutTime && `Check-out by ${checkOutTime}`,
  ].filter(Boolean).join(" · ")

  const schema = roomSchema(
    `${category.name} Room`,
    category.description || `${category.name} room at Le Palme Ahangama`,
    Number(category.base_price_usd),
    category.max_occupancy,
    `${APP_URL}/rooms/${slug}`
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <RoomDetail {...category} stayTimes={stayTimes} />
    </>
  )
}
