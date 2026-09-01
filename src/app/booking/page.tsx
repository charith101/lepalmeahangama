import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BookingWizard } from "@/components/public/BookingWizard"

export const metadata: Metadata = {
  title: "Check Availability & Book",
  description: "Select dates, choose your room, add extras, and book your stay at Le Palme Ahangama beachfront hotel.",
  robots: { index: false, follow: true },
}

const MOTORBIKE_NAMES = new Set([
  "Motorbike — TVS Ntorq 135CC",
  "Motorbike — Honda Dio 110CC",
  "Motorbike — Honda Navi 109cc",
])
const CAR_PREFIX = "Car — "

export default async function BookingPage(props: {
  searchParams: Promise<{ categoryId?: string; checkIn?: string; checkOut?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const [catResult, equipResult, routeResult, settingsResult] = await Promise.all([
    supabase.from("room_categories").select("id, name, base_price_usd, max_occupancy, description, image_url"),
    supabase.from("equipment_categories").select("id, name, price_per_day_usd"),
    supabase.from("airport_transfer_routes").select("fixed_price_usd"),
    supabase.from("settings").select("surcharge_pct"),
  ])

  const categories = catResult.data || []
  const equipData = equipResult.data || []
  const routeData = routeResult.data || []
  const settings = settingsResult.data?.[0]

  const findByName = (name: string) => equipData.find((e) => e.name === name)

  const surf = findByName("Surfboard")
  const bike = findByName("Bicycle")

  const motorbikes = equipData
    .filter((e) => MOTORBIKE_NAMES.has(e.name))
    .map((e) => ({ id: e.id, name: e.name.replace(/^Motorbike — /, ""), pricePerDay: Number(e.price_per_day_usd) }))

  const cars = equipData
    .filter((e) => e.name.startsWith(CAR_PREFIX))
    .sort((a, b) => Number(a.price_per_day_usd) - Number(b.price_per_day_usd))
    .map((e) => ({ id: e.id, name: e.name.replace(CAR_PREFIX, ""), pricePerDay: Number(e.price_per_day_usd) }))

  const pricing = {
    surfboardPricePerDay: Number(surf?.price_per_day_usd ?? 25),
    bicyclePricePerDay: Number(bike?.price_per_day_usd ?? 5),
    transferPrice: Number(routeData[0]?.fixed_price_usd ?? 30),
    surchargePct: Number(settings?.surcharge_pct ?? 5),
    motorbikes,
    cars,
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
