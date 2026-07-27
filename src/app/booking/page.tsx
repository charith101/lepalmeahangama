import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BookingWizard } from "@/components/public/BookingWizard"

export const metadata: Metadata = {
  title: "Check Availability & Book",
  description: "Select dates, choose your room, add extras, and book your stay at Le Palme Ahangama beachfront hotel.",
  robots: { index: false, follow: true },
}

export default async function BookingPage(props: {
  searchParams: Promise<{ categoryId?: string; checkIn?: string; checkOut?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const [catResult, equipResult, routeResult, settingsResult] = await Promise.all([
    supabase.from("room_categories").select("id, name, base_price_usd, max_occupancy, description, image_url"),
    supabase.from("equipment_categories").select("name, price_per_day_usd"),
    supabase.from("airport_transfer_routes").select("fixed_price_usd"),
    supabase.from("settings").select("surcharge_pct"),
  ])

  const categories = catResult.data || []
  const equipData = equipResult.data || []
  const routeData = routeResult.data || []
  const settings = settingsResult.data?.[0]

  const pricing = {
    surfboardPricePerDay: Number(equipData.find((e) => e.name === "Surfboard")?.price_per_day_usd ?? 15),
    bicyclePricePerDay: Number(equipData.find((e) => e.name === "Bicycle")?.price_per_day_usd ?? 5),
    transferPrice: Number(routeData[0]?.fixed_price_usd ?? 30),
    surchargePct: Number(settings?.surcharge_pct ?? 5),
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 pt-24 pb-16 px-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-10">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-2">
            Reservation
          </p>
          <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-serif font-normal leading-[1.14] text-stone-900 dark:text-stone-100">
            Book Your Stay
          </h1>
        </div>
        <BookingWizard
          categories={categories}
          pricing={pricing}
          defaultCategoryId={searchParams.categoryId}
          defaultCheckIn={searchParams.checkIn}
          defaultCheckOut={searchParams.checkOut}
        />
      </div>
    </div>
  )
}
