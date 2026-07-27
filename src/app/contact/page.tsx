import type { Metadata } from "next"
import { Mail, Phone, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Le Palme Ahangama. Located on Ahangama Beach Road, Sri Lanka.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
                Contact
              </p>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-6">
                Get in Touch
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-10">
                Whether you&apos;re planning a stay, curious about our experiences,
                or simply want to say hello — we&apos;d love to hear from you.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <MapPin className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Address</h3>
                    <p className="text-sm font-sans text-stone-500 dark:text-stone-400 leading-relaxed">
                      Ahangama Beach Road<br />
                      Ahangama, Southern Province<br />
                      Sri Lanka
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <Phone className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Phone</h3>
                    <a href="tel:+94-XXX-XXXXXX" className="text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                      +94-XXX-XXXXXX
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <Mail className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Email</h3>
                    <a href="mailto:info@lepalmeahangama.com" className="text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                      info@lepalmeahangama.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <form className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-8 py-3 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
