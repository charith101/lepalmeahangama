import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Le Palme Ahangama — a boutique beachfront hotel in Ahangama, Sri Lanka.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-20">
            <div>
              <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
                About
              </p>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-6">
                Le Palme Ahangama
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
                Nestled along the pristine shores of Ahangama on Sri Lanka&apos;s
                southern coast, Le Palme is an intimate beachfront escape where
                thoughtful design meets warm hospitality.
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-8">
                Our story began with a simple belief: that the most memorable
                travel experiences are found in the spaces between — between the
                waves and the shore, between tradition and modernity, between
                adventure and stillness. Every detail at Le Palme, from the
                handpicked furnishings to the curated local experiences, is
                designed to create that sense of effortless calm.
              </p>
              <Link
                href="/contact"
                className="inline-block px-8 py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
              >
                Get in Touch
              </Link>
            </div>
            <div className="relative aspect-4/3 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="/images/IMG-1.jpeg"
                alt="Beachfront view at Le Palme Ahangama"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="/images/IMG-2.jpeg"
                alt="Deluxe room at Le Palme"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800 mt-8">
              <img
                src="/images/IMG-3.jpeg"
                alt="Ocean view from Le Palme"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800">
              <img
                src="/images/IMG-4.jpeg"
                alt="Sunset at Le Palme"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-6">
              Our Philosophy
            </h2>
            <div className="space-y-4 text-stone-600 dark:text-stone-400 text-sm font-sans leading-relaxed">
              <p>
                We believe that true luxury is found in the details — the way
                light filters through palm fronds at golden hour, the warmth of
                a genuinely welcome smile, the taste of a fruit picked at its
                peak. Our beachfront property is a sanctuary for those seeking
                to reconnect with what matters.
              </p>
              <p>
                Sustainability is at the heart of what we do. We work with local
                farmers, fishermen, and artisans to bring the best of Sri Lanka
                to your table. Our rooms are designed to maximize natural
                ventilation and light, reducing our environmental footprint
                while enhancing your comfort.
              </p>
              <p>
                Whether you&apos;re here to ride the perfect wave, explore ancient
                temples, or simply read a book by the ocean, we invite you to
                make Le Palme your home on this beautiful island.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
