import Link from "next/link"
import { AnimatedSection } from "@/components/public/AnimatedSection"

export function WelcomeSection() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-white dark:bg-stone-950">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20">
        <AnimatedSection>
          <div>
            <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-5">
              Welcome to Le Palme
            </p>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100">
              A charming boutique retreat tucked into the lush gardens of Ahangama
            </h2>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={150}>
          <div className="flex flex-col justify-end">
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
              Just 800 m from Ahangama Beach and 5 km from Koggala Airport, Le
              Palme Ahangama offers comfortable family rooms with private
              bathrooms, balconies, and garden views. Soak up the sun on our
              terrace, gather in the garden or shared lounge, gather around the
              outdoor fireplace in the evening, and let the friendly host take
              care of the rest.
            </p>
            <Link
              href="/about"
              className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 border-b border-stone-900 dark:border-stone-100 pb-0.5 inline-block w-fit hover:opacity-60 transition-opacity"
            >
              Meet the Team
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
