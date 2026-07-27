import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { BedDouble } from "lucide-react"

type RoomCategory = {
  id: string
  name: string
  base_price_usd: number
  max_occupancy: number
  description: string | null
  image_url: string | null
}

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-")
}

export function RoomCategoryCard({ name, base_price_usd, max_occupancy, image_url }: RoomCategory) {
  return (
    <div className="flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
      <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-800 overflow-hidden">
        {image_url ? (
          <Image
            src={image_url}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BedDouble className="size-12 text-stone-300 dark:text-stone-600" />
          </div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-serif font-normal text-stone-900 dark:text-stone-100">{name}</h3>
          <span className="text-xs font-sans uppercase tracking-wider text-stone-400 dark:text-stone-500 whitespace-nowrap shrink-0 border border-stone-200 dark:border-stone-700 px-2 py-0.5">
            Up to {max_occupancy}
          </span>
        </div>
        <p className="text-[clamp(1.5rem,3vw,2rem)] font-serif font-normal text-stone-900 dark:text-stone-100">{formatCurrency(Number(base_price_usd))}</p>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400 mt-1">per night</p>
        <div className="mt-auto pt-6">
          <Link
            href={`/rooms/${slugify(name)}`}
            className="block w-full py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium text-center hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
