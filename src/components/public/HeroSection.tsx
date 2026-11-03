"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { MotionConfig } from "motion/react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

const bookingEnabled = process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false"

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1535262412227-85541e910204?q=90&w=2560&auto=format&fit=crop"

const HERO_FACTS = ["800 m to Ahangama Beach", "Sun terrace", "Free Wi-Fi"]

type DateFieldProps = {
  label: string
  ariaLabel: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  isDateDisabled: (date: Date) => boolean
  className?: string
}

function DateField({
  label,
  ariaLabel,
  value,
  onChange,
  isDateDisabled,
  className,
}: DateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          "group flex h-16 w-full flex-col items-start justify-center px-4 text-left outline-none transition-colors hover:bg-stone-900/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 sm:h-[72px] sm:px-5",
          className
        )}
      >
        <span className="text-[9px] font-sans font-medium uppercase tracking-[0.24em] text-stone-500">
          {label}
        </span>
        <span
          className={cn(
            "mt-1 flex w-full items-center justify-between gap-2 text-base font-sans sm:text-sm",
            value ? "text-stone-900" : "text-stone-500"
          )}
        >
          {value ? format(value, "dd MMM yyyy") : "Select date"}
          <ChevronDown className="size-3.5 shrink-0 text-stone-400 transition-transform group-data-[popup-open]:rotate-180" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={isDateDisabled}
          // Larger day cells on touch screens keep the tap targets comfortable.
          className="p-3 [--cell-size:--spacing(9)] sm:p-2 sm:[--cell-size:--spacing(7)]"
        />
      </PopoverContent>
    </Popover>
  )
}

export function HeroSection() {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState("2")

  const datesValid = checkIn !== undefined && checkOut !== undefined && checkOut > checkIn

  function handleSearch() {
    if (!datesValid) return
    const params = new URLSearchParams()
    if (checkIn) params.set("checkIn", format(checkIn, "yyyy-MM-dd"))
    if (checkOut) params.set("checkOut", format(checkOut, "yyyy-MM-dd"))
    if (guests) params.set("guests", guests)
    router.push(`/booking?${params.toString()}`)
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby="hero-heading"
        className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black"
      >
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          sizes="100vw"
          preload
          aria-hidden
          className="object-cover object-center"
        />

        {/* Cinematic scrims: keep the nav and lower-left type legible without flattening the photo. */}
        <div aria-hidden className="absolute inset-0 bg-black/15" />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.42)_30%,rgba(0,0,0,0)_65%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.16)_38%,rgba(0,0,0,0)_66%)] sm:block"
        />

        <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-6 pt-28 sm:px-12 sm:pb-10 lg:pb-12">
          <div className="max-w-2xl">
            <BlurFade direction="up" offset={10} blur="4px" delay={0.1} duration={0.8}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-white/50" />
                <p className="text-[9px] font-sans font-medium uppercase tracking-[0.34em] text-white/70 sm:text-[10px]">
                  Ahangama · Sri Lanka
                </p>
              </div>
            </BlurFade>

            <BlurFade direction="up" offset={18} blur="6px" delay={0.18} duration={0.9}>
              <h1
                id="hero-heading"
                className="mt-5 font-serif text-[clamp(3.6rem,9vw,8rem)] font-normal leading-[0.9] tracking-[-0.03em] text-white"
              >
                Le Palme
                <span className="sr-only"> Ahangama</span>
              </h1>
            </BlurFade>

            <BlurFade direction="up" offset={12} blur="4px" delay={0.3} duration={0.8}>
              <p className="mt-2 font-serif text-[clamp(1.25rem,2.4vw,2.1rem)] italic leading-snug text-white/85 sm:mt-3">
                A garden by the southern sea
              </p>
            </BlurFade>

            <BlurFade direction="up" offset={12} blur="4px" delay={0.42} duration={0.8}>
              <p className="mt-5 max-w-md text-[13px] font-sans leading-relaxed text-white/75 sm:text-[15px]">
                A charming boutique retreat with lush gardens, a sun terrace, and
                a friendly host — just 800 m from Ahangama Beach.
              </p>
            </BlurFade>

            <BlurFade direction="up" offset={8} blur="2px" delay={0.52} duration={0.8}>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-sans font-medium uppercase tracking-[0.2em] text-white/55 sm:text-[10px]">
                {HERO_FACTS.map((fact, i) => (
                  <span key={fact} className="flex items-center gap-2.5">
                    {i > 0 && (
                      <span aria-hidden className="hidden text-white/30 sm:inline">
                        ·
                      </span>
                    )}
                    {fact}
                  </span>
                ))}
              </div>
            </BlurFade>
          </div>

          <BlurFade
            direction="up"
            offset={18}
            blur="6px"
            delay={0.64}
            duration={0.85}
            className="mt-8 w-full max-w-3xl sm:mt-10 xl:max-w-[880px]"
          >
            {bookingEnabled ? (
              <div className="bg-canvas-warm shadow-[0_28px_70px_-28px_rgba(0,0,0,0.8)] ring-1 ring-black/5">
                <div className="grid grid-cols-2 sm:flex sm:items-stretch">
                  <DateField
                    label="Arrival"
                    ariaLabel="Select arrival date"
                    value={checkIn}
                    onChange={setCheckIn}
                    isDateDisabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    className="border-b border-r border-stone-300/70 sm:flex-1 sm:border-b-0 sm:border-r-0"
                  />
                  <DateField
                    label="Departure"
                    ariaLabel="Select departure date"
                    value={checkOut}
                    onChange={setCheckOut}
                    isDateDisabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                      (checkIn ? date <= checkIn : false)
                    }
                    className="border-b border-stone-300/70 sm:flex-1 sm:border-b-0 sm:border-l"
                  />

                  <div className="relative col-span-2 flex h-16 flex-col justify-center border-b border-stone-300/70 px-4 sm:col-span-1 sm:h-auto sm:w-[128px] sm:border-b-0 sm:border-l sm:px-5">
                    <label
                      htmlFor="hero-guests"
                      className="text-[9px] font-sans font-medium uppercase tracking-[0.24em] text-stone-500"
                    >
                      Guests
                    </label>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <select
                        id="hero-guests"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-base font-sans text-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 sm:text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "Guest" : "Guests"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none size-3.5 shrink-0 text-stone-400" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={!datesValid}
                    className={cn(
                      "group col-span-2 flex h-16 items-center justify-center gap-2 px-6 text-[10px] font-sans font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:h-auto sm:min-w-[200px]",
                      datesValid
                        ? "bg-stone-900 text-white hover:bg-stone-800"
                        : "cursor-not-allowed bg-stone-300 text-stone-600"
                    )}
                  >
                    {!checkIn || !checkOut
                      ? "Select dates"
                      : checkOut <= checkIn
                        ? "Invalid dates"
                        : "Check availability"}
                    <ArrowRight
                      className={cn(
                        "size-3.5",
                        datesValid && "transition-transform group-hover:translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-canvas-warm px-6 py-7 ring-1 ring-black/5 sm:px-8">
                <p className="text-[9px] font-sans font-medium uppercase tracking-[0.24em] text-stone-500">
                  Reservations
                </p>
                <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-stone-700">
                  Online booking is temporarily unavailable. Please contact us
                  directly to reserve your stay.
                </p>
              </div>
            )}
          </BlurFade>
        </div>

        <div className="pointer-events-none absolute bottom-12 right-12 z-10 hidden text-right xl:block">
          <span aria-hidden className="mb-4 ml-auto block h-px w-12 bg-white/30" />
          <p className="text-[9px] font-sans font-medium uppercase tracking-[0.3em] text-white/55">
            Garden &amp; Terrace
          </p>
          <p className="mt-2 text-[9px] font-sans tracking-[0.18em] text-white/35">
            5°58′N · 80°21′E
          </p>
        </div>
      </section>
    </MotionConfig>
  )
}
