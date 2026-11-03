import { AnimatedSection } from "@/components/public/AnimatedSection"

const eventCards = [
  {
    title: "Private Dining",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Celebrations",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Workshops & Events",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1000&auto=format&fit=crop",
  },
]

export function EventsSection() {
  return (
    <section className="py-20 sm:py-28 px-6 bg-stone-50 dark:bg-stone-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
              Events
            </p>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100 mb-4">
              Events & Gatherings
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed">
              From intimate dinners to destination celebrations, our garden
              venue provides a stunning backdrop for life&apos;s most memorable moments.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {eventCards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 150}>
              <div className="group relative block aspect-4/5 overflow-hidden bg-stone-200 dark:bg-stone-800">
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white text-lg font-serif font-normal">{card.title}</h3>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
