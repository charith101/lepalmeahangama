import type { Metadata } from "next"
import Link from "next/link"
import {
  HOTEL_ADDRESS_FULL,
  HOTEL_DESCRIPTION,
  HOTEL_MAP_EMBED_URL,
  HOTEL_MAP_LINK,
  HOTEL_NAME,
} from "@/lib/constants"

export const metadata: Metadata = {
  title: "About Us",
  description: `${HOTEL_NAME} — a charming boutique property in Ahangama, Sri Lanka. Family rooms with garden views, sun terrace, and a friendly host near Kabalana Beach.`,
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
                {HOTEL_NAME}
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
                {HOTEL_NAME} is a charming boutique property located in the
                serene coastal town of Ahangama, Sri Lanka. Known for its
                tranquil atmosphere, this accommodation offers a unique blend of
                modern comfort and traditional Sri Lankan hospitality.
                Surrounded by lush gardens and just a short drive from the
                beach, guests can enjoy a peaceful retreat.
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
                The property features well-appointed family rooms with private
                bathrooms, balconies, and garden views. Each room is equipped
                with air-conditioning, a work desk, and free WiFi — so you can
                work, rest, or simply unwind. Our sun terrace, garden, shared
                lounge, outdoor fireplace, and children&apos;s playground give
                you plenty of space to relax, while the shared kitchen, coffee
                shop, and outdoor seating area make every meal feel easy.
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-8">
                With a focus on wellness and genuine hospitality, Le Palme
                caters to both leisure travelers and those in search of
                adventure. Whether you&apos;re here for the surf, the
                countryside, or simply the calm of the southern coast, our
                friendly host is on hand to make your stay memorable.
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
                alt={`${HOTEL_NAME} — garden and rooms in Ahangama`}
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
                alt="Garden view from Le Palme"
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

          <div className="max-w-3xl mb-20">
            <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-6">
              What Our Guests Love
            </h2>
            <div className="space-y-4 text-stone-600 dark:text-stone-400 text-sm font-sans leading-relaxed">
              <p>
                Couples in particular like the location — they rate it
                <strong className="text-stone-900 dark:text-stone-100"> 8.6 </strong>
                for a two-person trip. Conveniently situated in Ahangama, our
                property puts you close to attractions and interesting dining
                options. This 4.0-star property is packed with in-house
                facilities to improve the quality and joy of your stay.
              </p>
              <p>
                We&apos;re located just 1.4 miles from Kabalana Beach and 5 miles
                from Koggala Airport, giving you easy access to the best of the
                south coast. Guests appreciate the quietness of the area and the
                warm, friendly host — many return year after year.
              </p>
              <p>
                Every morning starts with a full English or Irish breakfast,
                served with vegetarian and Asian options. Local specialties,
                warm dishes, fresh pastries, and fruits round out the table, so
                you can fuel up for a day of surfing, exploring, or simply doing
                nothing at all.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-3">
                  Find Us
                </p>
                <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100">
                  Our Location
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-sm font-sans leading-relaxed mt-2 max-w-xl">
                  <a
                    href={HOTEL_MAP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                  >
                    {HOTEL_ADDRESS_FULL}
                  </a>
                </p>
              </div>
            </div>
            <div className="relative w-full aspect-[16/9] overflow-hidden border border-stone-200 dark:border-stone-800">
              <iframe
                title={`${HOTEL_NAME} location map`}
                src={HOTEL_MAP_EMBED_URL}
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
