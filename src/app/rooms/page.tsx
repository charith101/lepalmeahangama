import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { RoomCategoryCard } from "@/components/public/RoomCategoryCard"

export const metadata: Metadata = {
  title: "Rooms & Rates",
  description: "Choose from Deluxe beachfront rooms or Budget garden-view rooms. Surfboard & bike rentals, airport transfer available.",
  openGraph: {
    title: "Rooms & Rates — Le Palme Ahangama",
    description: "Choose from Deluxe beachfront rooms or Budget garden-view rooms.",
  },
}

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
            Choose from our Deluxe beachfront or Budget garden-view rooms
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
