import Link from "next/link"

export function WelcomeSection() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-white dark:bg-stone-950">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20">
        <div>
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-5">
            Welcome to Le Palme
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100">
            A tranquil sanctuary where the Indian Ocean meets golden shores
          </h2>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
            Nestled along the pristine coastline of Ahangama, Le Palme offers an
            intimate escape from the everyday. Thoughtfully designed spaces,
            warm Sri Lankan hospitality, and the gentle rhythm of the ocean
            create an atmosphere of effortless calm.
          </p>
          <Link
            href="/about"
            className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 border-b border-stone-900 dark:border-stone-100 pb-0.5 inline-block w-fit hover:opacity-60 transition-opacity"
          >
            Meet the Team
          </Link>
        </div>
      </div>
    </section>
  )
}
