import Link from "next/link"
import { AnimatedSection } from "@/components/public/AnimatedSection"

export function RoomShowcase() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-white dark:bg-stone-950">
      <AnimatedSection>
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Accommodations
          </p>
          <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100 mb-5">
            Rooms & Suites
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed max-w-xl mx-auto">
            Each room is thoughtfully designed to blend modern comfort with
            coastal charm. Drift off to the sound of the waves and wake to golden
            light filtering through tropical palms.
          </p>
        </div>
      </AnimatedSection>
      <div className="max-w-6xl mx-auto">
        <AnimatedSection delay={150}>
          <div className="relative aspect-[21/9] overflow-hidden bg-stone-200 dark:bg-stone-800 mb-4">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop"
              alt="Deluxe Room at Le Palme Ahangama"
              className="w-full h-full object-cover"
            />
          </div>
        </AnimatedSection>
        <AnimatedSection delay={300}>
          <p className="text-stone-500 dark:text-stone-400 text-xs font-sans tracking-wide">
            Deluxe Room — Private balcony with garden views
          </p>
        </AnimatedSection>
      </div>
      <AnimatedSection delay={450}>
        <div className="text-center mt-10">
          <Link
            href="/rooms"
            className="inline-block px-8 py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
          >
            View All Rooms
          </Link>
        </div>
      </AnimatedSection>
    </section>
  )
}
