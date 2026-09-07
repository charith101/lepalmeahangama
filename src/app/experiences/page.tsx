import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Experiences",
  description: "Discover Ahangama — surfing, cycling, wildlife, and cultural experiences at Le Palme.",
}

const experiences = [
  {
    title: "Surfing",
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1000&auto=format&fit=crop",
    description:
      "Ahangama is home to some of Sri Lanka's finest surf breaks. Whether you're a beginner catching your first wave or an experienced surfer seeking the perfect swell, our team can arrange lessons, board rentals, and guided sessions to the best spots along the coast.",
  },
  {
    title: "Cycling & Nature",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1000&auto=format&fit=crop",
    description:
      "Explore the lush countryside surrounding Ahangama by bicycle. Ride through emerald rice paddies, visit traditional villages, and discover hidden temples. Our guided cycling tours offer an authentic glimpse into daily life in southern Sri Lanka.",
  },
  {
    title: "Wildlife & Safari",
    image: "https://images.unsplash.com/photo-1603789764099-52b21a871336?q=80&w=1000&auto=format&fit=crop",
    description:
      "Embark on a safari to Yala National Park, home to leopards, elephants, and a stunning array of birdlife. Closer to home, visit turtle hatcheries, watch whales off the coast, or simply observe the vibrant marine life while snorkeling.",
  },
  {
    title: "Cultural Tours",
    image: "https://images.unsplash.com/photo-1704797390682-76479a29dc9a?q=80&w=1000&auto=format&fit=crop",
    description:
      "Dive into Sri Lanka's rich cultural heritage with visits to the historic Galle Fort, tea plantations in the hill country, and traditional cooking classes. Our concierge curates each experience to give you a meaningful connection to the island's traditions.",
  },
  {
    title: "Skate Paths",
    image: "https://images.unsplash.com/photo-1547447134-cd3f5c65ffc0?q=80&w=1000&auto=format&fit=crop",
    description:
      "Roll through Ahangama's smoothest coastal lanes and palm-shaded village paths on our guided skate tours. From relaxed rides along the shoreline near Kabalana Beach to longer routes winding through rice paddies and sleepy fishing villages, our team sets you up with boards, helmets, and the best local lines for every level. It's the most playful way to slow down, take in the southern coast, and feel the rhythm of daily life on four wheels.",
  },
]

export default function ExperiencesPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
              Experiences
            </p>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-6">
              Discover Ahangama
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed">
              Beyond our shores lies a world of discovery. From world-class waves
              to ancient temples, every experience is designed to connect you with
              the heart of Sri Lanka.
            </p>
          </div>

          <div className="space-y-24">
            {experiences.map((exp, i) => (
              <div
                key={exp.title}
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center ${
                  i % 2 === 1 ? "md:grid-flow-dense" : ""
                }`}
              >
                <div className={i % 2 === 1 ? "md:col-start-2" : ""}>
                  <h2 className="text-2xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                    {exp.title}
                  </h2>
                  <p className="text-stone-600 dark:text-stone-400 text-sm font-sans leading-relaxed mb-6">
                    {exp.description}
                  </p>
                  <Link
                    href="/contact"
                    className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 border-b border-stone-900 dark:border-stone-100 pb-0.5 inline-block w-fit hover:opacity-60 transition-opacity"
                  >
                    Inquire About This Experience
                  </Link>
                </div>
                <div
                  className={`relative aspect-4/3 overflow-hidden bg-stone-200 dark:bg-stone-800 ${
                    i % 2 === 1 ? "md:col-start-1 md:row-start-1" : ""
                  }`}
                >
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-24 text-center">
            <Link
              href="/contact"
              className="inline-block px-8 py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
            >
              Plan Your Experience
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
