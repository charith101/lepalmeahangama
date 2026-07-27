import Link from "next/link"

export function RestaurantSection() {
  return (
    <section className="py-24 sm:py-32 px-6 bg-stone-50 dark:bg-stone-900">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Dining
          </p>
          <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-serif font-normal leading-[1.15] text-stone-900 dark:text-stone-100 mb-5">
            A Taste of Sri Lanka
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-6">
            Our restaurant celebrates the vibrant flavors of Sri Lankan cuisine,
            from freshly caught seafood to fragrant curries and tropical fruits.
            Dine overlooking the ocean as the sun paints the sky in shades of
            amber and rose.
          </p>
          <Link
            href="/dine"
            className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 border-b border-stone-900 dark:border-stone-100 pb-0.5 inline-block w-fit hover:opacity-60 transition-opacity"
          >
            Read More
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-3/4 overflow-hidden bg-stone-200 dark:bg-stone-800">
            <img
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1974&auto=format&fit=crop"
              alt="Restaurant dining"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative aspect-3/4 overflow-hidden bg-stone-200 dark:bg-stone-800 mt-8">
            <img
              src="https://images.unsplash.com/photo-1574966739987-65e38db0f7ce?q=80&w=1742&auto=format&fit=crop"
              alt="Food plating"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
