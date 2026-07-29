const photos = [
  {
    src: "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?q=80&w=1000&auto=format&fit=crop",
    alt: "Tropical sunset over the ocean",
  },
  {
    src: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1000&auto=format&fit=crop",
    alt: "Surfing at sunset",
  },
  {
    src: "https://images.unsplash.com/photo-1571772996212-2f6f2a5e6f4e?q=80&w=1000&auto=format&fit=crop",
    alt: "Palm trees at the beach",
  },
  {
    src: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1000&auto=format&fit=crop",
    alt: "Beachfront pool",
  },
]

export function PhotoGallery() {
  return (
    <section className="py-20 sm:py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-stone-400 text-center mb-4">
          Gallery
        </p>
        <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-light leading-[1.14] text-stone-900 text-center mb-14">
          Life at Le Palme
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {photos.map((photo, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-lg ${i === 0 ? "row-span-2" : ""}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover aspect-[4/3] first:aspect-auto first:h-full hover:scale-105 transition-transform duration-700"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
