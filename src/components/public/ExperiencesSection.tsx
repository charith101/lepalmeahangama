import Link from "next/link"
import { AnimatedSection } from "@/components/public/AnimatedSection"

export function ExperiencesSection() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-white dark:bg-stone-950">
      <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-12 md:gap-16 items-center">
        <AnimatedSection className="md:col-span-3">
          <div className="relative aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-800">
            <img
              src="https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1000&auto=format&fit=crop"
              alt="Surfing at Ahangama"
              className="w-full h-full object-cover"
            />
          </div>
        </AnimatedSection>
        <AnimatedSection delay={150} className="md:col-span-2">
          <div>
            <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
              Experiences
            </p>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100 mb-5">
              Discover Ahangama
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
              Beyond our shores lies a world of discovery. Surf world-class waves,
              explore ancient temples, cycle through emerald rice paddies, or
              simply wander the coastal path at sunset. Our concierge team curates
              every experience with care.
            </p>
            <Link
              href="/experiences"
              className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 border-b border-stone-900 dark:border-stone-100 pb-0.5 inline-block w-fit hover:opacity-60 transition-opacity"
            >
              Read More
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
