import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { RoomCategoryCard } from "@/components/public/RoomCategoryCard"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Rooms & Rates",
  description: "Family rooms at Le Palme Ahangama with private bathrooms, balconies, and garden views — plus air-conditioning, a work desk, and free WiFi.",
  path: "/rooms",
})

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from("room_categories").select("*")

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Accommodation
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">
            Rooms & Rates
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans max-w-md mx-auto">
            Comfortable family rooms with private bathrooms, balconies, and
            garden views — air-conditioning, a work desk, and free WiFi in
            every room.
          </p>
        </div>
      </section>
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {categories?.map((cat) => (
            <RoomCategoryCard key={cat.id} {...cat} />
          ))}
        </div>
      </section>
    </div>
  )
}
