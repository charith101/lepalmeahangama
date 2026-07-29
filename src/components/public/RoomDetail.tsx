import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Users, BedDouble } from "lucide-react"

type RoomCategory = {
  id: string
  name: string
  base_price_usd: number
  max_occupancy: number
  description: string | null
  image_url: string | null
}

export function RoomDetail({ id, name, base_price_usd, max_occupancy, description, image_url }: RoomCategory) {
  const today = new Date()
  const checkIn = new Date(today)
  checkIn.setDate(checkIn.getDate() + 1)
  const checkOut = new Date(today)
  checkOut.setDate(checkOut.getDate() + 4)
  const bookingUrl = `/booking?categoryId=${id}&checkIn=${checkIn.toISOString().split("T")[0]}&checkOut=${checkOut.toISOString().split("T")[0]}`

  const points = description
    ? description.split("\n").filter(Boolean)
    : []

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <Link href="/rooms" className="inline-flex items-center gap-1 text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-8">
          &larr; Back to rooms
        </Link>

        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-3">
            <div className="relative aspect-video bg-stone-100 dark:bg-stone-800 overflow-hidden mb-8 border border-stone-200 dark:border-stone-800">
              {image_url ? (
                <img
                  src={image_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BedDouble className="size-16 text-stone-300 dark:text-stone-600" />
                </div>
              )}
            </div>

            <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">{name}</h1>

            <div className="flex gap-3 mb-6">
              <span className="text-xs font-sans uppercase tracking-wider text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 px-3 py-1 flex items-center gap-1.5">
                <Users className="size-3" /> Up to {max_occupancy} guests
              </span>
            </div>

            {points.length > 0 ? (
              <ul className="space-y-2">
                {points.map((pt, i) => (
                  <li key={i} className="text-sm font-sans text-stone-600 dark:text-stone-400 flex items-start gap-2 leading-relaxed">
                    <span className="mt-2 block size-1 rounded-full bg-stone-400 dark:bg-stone-500 shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-sans leading-relaxed text-stone-600 dark:text-stone-400 max-w-prose">
                {description || `Our ${name.toLowerCase()} room offers comfortable accommodation with modern amenities.`}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8">
              <p className="text-[clamp(1.8rem,3vw,2.2rem)] font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">{formatCurrency(Number(base_price_usd))}</p>
              <p className="text-sm font-sans text-stone-500 dark:text-stone-400 mb-8">per night</p>

              <div className="space-y-3 mb-8 text-sm font-sans">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Max occupancy</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">{max_occupancy} guests</span>
                </div>
              </div>

              <Link href={bookingUrl}>
                <span className="flex w-full py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium text-center hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors cursor-pointer">
                  Check Availability
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
