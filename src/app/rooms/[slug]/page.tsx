import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { RoomDetail } from "@/components/public/RoomDetail"
import { roomSchema } from "@/lib/seo"
import { APP_URL } from "@/lib/constants"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

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
  const description = category.description || `${category.name} room at Le Palme Ahangama. From $${category.base_price_usd}/night.`

  return {
    title: `${category.name} Room`,
    description,
    openGraph: { title, description },
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
      <RoomDetail {...category} />
    </>
  )
}
