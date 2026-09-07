import { Wifi, Sun, TreePine, Coffee, Flame, UtensilsCrossed, Bike, Plane } from "lucide-react"

const amenities = [
  { icon: Sun, label: "Sun Terrace" },
  { icon: TreePine, label: "Garden" },
  { icon: Wifi, label: "Free WiFi" },
  { icon: UtensilsCrossed, label: "Shared Kitchen" },
  { icon: Coffee, label: "Coffee Shop" },
  { icon: Flame, label: "Outdoor Fireplace" },
  { icon: Bike, label: "Bicycle Rental" },
  { icon: Plane, label: "Airport Shuttle" },
]

export function AmenitiesSection() {
  return (
    <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: "#fce5df" }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-stone-500 text-center mb-4">
          Amenities
        </p>
        <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-light leading-[1.14] text-stone-900 text-center mb-14">
          Everything You Need
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-10 sm:gap-y-12">
          {amenities.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3 text-center">
              <div className="size-14 sm:size-16 rounded-full flex items-center justify-center bg-white/70">
                <Icon className="size-6 sm:size-7 text-stone-700" />
              </div>
              <span className="text-sm font-medium text-stone-800">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
