import Link from "next/link"

export function PublicFooter() {
  return (
    <footer className="bg-stone-900 dark:bg-black text-stone-400 dark:text-stone-500">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          <div>
            <span className="text-white dark:text-stone-100 text-lg font-serif font-normal tracking-wide">
              Le Palme
            </span>
          </div>
          <div>
            <h4 className="text-white dark:text-stone-100 text-xs font-sans font-medium uppercase tracking-[0.15em] mb-5">Contact</h4>
            <div className="space-y-3 text-sm font-sans leading-relaxed">
              <p>Ahangama Beach Road<br />Ahangama, Sri Lanka</p>
              <p>+94-XXX-XXXXXX</p>
              <a href="mailto:info@lepalmeahangama.com" className="block hover:text-white dark:hover:text-stone-100 transition-colors">
                info@lepalmeahangama.com
              </a>
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
          {/* <div>
            <h4 className="text-white dark:text-stone-100 text-xs font-sans font-medium uppercase tracking-[0.15em] mb-5">Careers</h4>
            <div className="space-y-2.5 text-sm font-sans">
              <a href="#" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Work With Us</a>
              <a href="#" className="block hover:text-white dark:hover:text-stone-100 transition-colors">Join Our Team</a>
            </div>
          </div> */}
        </div>
        <div className="mt-16 pt-8 border-t border-stone-800 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-sans text-stone-600 dark:text-stone-600">
          <p>&copy; {new Date().getFullYear()} Le Palme Ahangama. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
