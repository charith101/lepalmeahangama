import type { Metadata } from "next"
import Link from "next/link"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Dining",
  description: "Start the morning with a full English or Irish breakfast — vegetarian and Asian options, local specialties, fresh pastries, and fruits — at Le Palme Ahangama.",
  path: "/dine",
})

export default function DinePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-20">
            <div>
              <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
                Dining
              </p>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-6">
                A Taste of Sri Lanka
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
                Every morning at Le Palme begins with a generous breakfast
                spread — a full English or Irish breakfast alongside
                vegetarian and Asian options, local specialties, warm dishes,
                fresh pastries, and tropical fruits. Pull up a chair in the
                outdoor seating area, in the garden, or in our coffee shop,
                and let the day start slowly.
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-8">
                When the sun dips, our chef turns to the island&apos;s best
                local produce — freshly caught seafood, fragrant curries, and
                seasonal ingredients — for relaxed dinners in the garden. With
                a shared kitchen on hand, you&apos;re welcome to put together
                your own simple meal whenever the mood strikes.
              </p>
              <Link
                href="/contact?subject=Table%20Reservation"
                className="inline-block px-8 py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
              >
                Reserve a table — we&apos;ll confirm by email
              </Link>
            </div>
            <div className="relative aspect-4/3 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000&auto=format&fit=crop"
                alt="Restaurant dining at Le Palme"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"
                alt="Sri Lankan cuisine"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800 mt-8">
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop"
                alt="Fresh seafood"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="https://images.unsplash.com/photo-1549666020-bd56b7d535f2?q=80&w=1000&auto=format&fit=crop"
                alt="Restaurant interior"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="mt-20 max-w-3xl">
            <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
              Hours & Reservations
            </h2>
            <div className="text-stone-600 dark:text-stone-400 text-sm font-sans leading-relaxed space-y-2">
              <p>Breakfast: 7:00 AM — 10:30 AM</p>
              <p>Lunch: 12:00 PM — 2:30 PM</p>
              <p>Dinner: 6:00 PM — 10:00 PM</p>
              <p className="pt-4">Private dining experiences available upon request.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
