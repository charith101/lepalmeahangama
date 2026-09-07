"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, Phone, Mail } from "lucide-react"
import {
  HOTEL_ADDRESS_FULL,
  HOTEL_EMAIL,
  HOTEL_MAP_EMBED_URL,
  HOTEL_MAP_LINK,
  HOTEL_NAME,
  HOTEL_PHONE_DISPLAY,
  HOTEL_PHONE_TEL,
} from "@/lib/constants"

export function PublicFooter() {
  const pathname = usePathname()

  if (pathname.startsWith("/dashboard")) return null

  return (
    <footer className="bg-stone-900 dark:bg-black text-stone-400 dark:text-stone-500">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          <div>
            <span className="text-white dark:text-stone-100 text-lg font-serif font-normal tracking-wide">
              {HOTEL_NAME}
            </span>
            <p className="mt-3 text-sm font-sans leading-relaxed max-w-xs">
              A charming boutique property in Ahangama — comfortable rooms, lush
              gardens, sun terrace, and a friendly host near Kabalana Beach.
            </p>
          </div>
          <div>
            <h4 className="text-white dark:text-stone-100 text-xs font-sans font-medium uppercase tracking-[0.15em] mb-5">Contact</h4>
            <div className="space-y-3 text-sm font-sans leading-relaxed">
              <p className="flex items-start gap-2">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <a
                  href={HOTEL_MAP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white dark:hover:text-stone-100 transition-colors"
                >
                  {HOTEL_ADDRESS_FULL}
                </a>
              </p>
              <p className="flex items-start gap-2">
                <Phone className="size-4 mt-0.5 shrink-0" />
                <a
                  href={`tel:${HOTEL_PHONE_TEL}`}
                  className="hover:text-white dark:hover:text-stone-100 transition-colors"
                >
                  {HOTEL_PHONE_DISPLAY}
                </a>
              </p>
              <p className="flex items-start gap-2">
                <Mail className="size-4 mt-0.5 shrink-0" />
                <a
                  href={`mailto:${HOTEL_EMAIL}`}
                  className="block hover:text-white dark:hover:text-stone-100 transition-colors"
                >
                  {HOTEL_EMAIL}
                </a>
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-white dark:text-stone-100 text-xs font-sans font-medium uppercase tracking-[0.15em] mb-5">Quick Links</h4>
            <div className="space-y-2.5 text-sm font-sans">
              <Link href="/rooms" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Rooms</Link>
              <Link href="/about" className="block hover:text-white dark:hover:text-stone-100 transition-colors">About</Link>
              <Link href="/experiences" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Experiences</Link>
              <Link href="/booking/lookup" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Manage Booking</Link>
              <Link href="/contact" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Contact</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white dark:text-stone-100 text-xs font-sans font-medium uppercase tracking-[0.15em] mb-5">Legal</h4>
            <div className="space-y-2.5 text-sm font-sans">
              <Link href="/refund-policy" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Refund Policy</Link>
              <Link href="/privacy-policy" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Privacy Policy</Link>
              <Link href="/terms-and-conditions" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <div className="relative w-full aspect-[21/9] overflow-hidden border border-stone-800 dark:border-stone-800">
            <iframe
              title="Le Palme Ahangama location map"
              src={HOTEL_MAP_EMBED_URL}
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-stone-800 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-sans text-stone-600 dark:text-stone-600">
          <p>&copy; {new Date().getFullYear()} {HOTEL_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
