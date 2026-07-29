import Link from "next/link"
import { AnimatedSection } from "@/components/public/AnimatedSection"

const cards = [
  {
    title: "Stay With Us",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1000&auto=format&fit=crop",
    href: "/rooms",
  },
  {
    title: "Dine With Us",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000&auto=format&fit=crop",
    href: "/dine",
  },
  {
    title: "Events & Gatherings",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop",
    href: "/events",
  },
]

export function HotelIntroSection() {
  return (
    <section className="py-20 sm:py-28 px-6 bg-stone-50 dark:bg-stone-900">
      <div className="max-w-4xl mx-auto text-center mb-14">
        <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100 mb-5">
          Le Palme Ahangama
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed max-w-2xl mx-auto mb-8">
          A boutique beachfront property where every detail is considered.
          From sun-drenched days by the ocean to intimate evenings under the
          stars — your Sri Lankan escape begins here.
        </p>
        <Link
          href="/contact"
          className="inline-block px-8 py-2.5 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
        >
          Contact Us
        </Link>
      </div>
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <AnimatedSection key={card.title} delay={i * 150}>
            <Link
              href={card.href}
              className="group relative block aspect-[4/5] overflow-hidden bg-stone-200 dark:bg-stone-800"
            >
              <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-white text-lg font-serif font-normal">{card.title}</h3>
              </div>
            </Link>
          </AnimatedSection>
        ))}
      </div>
    </section>
  )
}
