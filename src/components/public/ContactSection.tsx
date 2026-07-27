import Link from "next/link"

export function ContactSection() {
  return (
    <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: "#fce5df" }}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-4">
          Book Direct
        </p>
        <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-light leading-[1.14] text-stone-900 mb-5">
          Ready to experience paradise?
        </h2>
        <p className="text-stone-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
          Book directly with us for the best rates and personalized service.
          We&apos;re here to make your stay unforgettable.
        </p>
        <Link
          href="/booking"
          className="inline-flex h-12 items-center justify-center rounded-full bg-stone-900 text-white px-8 text-sm font-medium hover:bg-stone-800 transition-colors min-w-[200px]"
        >
          Book Your Stay
        </Link>
      </div>
    </section>
  )
}
