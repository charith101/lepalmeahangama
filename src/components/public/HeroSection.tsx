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

const HERO_FACTS = ["800m to Ahangama Beach", "Lush gardens", "Friendly host"]

const LOCATION = "Ahangama, Sri Lanka"

const DESCRIPTION =
  "A charming boutique retreat with lush gardens, a sun terrace, and a friendly host — just 800 m from Ahangama Beach."

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
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-stone-600">
          {label}
        </span>
        <span
          className={cn(
            "mt-1 flex w-full items-center justify-between gap-2 font-sans text-base sm:text-sm",
            value ? "text-stone-900" : "text-stone-600"
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

type BookingBarProps = {
  checkIn: Date | undefined
  checkOut: Date | undefined
  guests: string
  datesValid: boolean
  onCheckInChange: (date: Date | undefined) => void
  onCheckOutChange: (date: Date | undefined) => void
  onGuestsChange: (guests: string) => void
  onSearch: () => void
}

function BookingBar({
  checkIn,
  checkOut,
  guests,
  datesValid,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onSearch,
}: BookingBarProps) {
  const inner = bookingEnabled ? (
    <div className="grid grid-cols-2 sm:flex sm:items-stretch">
      <DateField
        label="Arrival"
        ariaLabel="Select arrival date"
        value={checkIn}
        onChange={onCheckInChange}
        isDateDisabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        className="border-b border-r border-stone-300/70 sm:flex-1 sm:border-b-0 sm:border-r-0"
      />
      <DateField
        label="Departure"
        ariaLabel="Select departure date"
        value={checkOut}
        onChange={onCheckOutChange}
        isDateDisabled={(date) =>
          date < new Date(new Date().setHours(0, 0, 0, 0)) ||
          (checkIn ? date <= checkIn : false)
        }
        className="border-b border-stone-300/70 sm:flex-1 sm:border-b-0 sm:border-l"
      />

      <div className="relative col-span-2 flex h-16 flex-col justify-center border-b border-stone-300/70 px-4 sm:col-span-1 sm:h-auto sm:w-[136px] sm:border-b-0 sm:border-l sm:px-5">
        <label
          htmlFor="hero-guests"
          className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-stone-600"
        >
          Guests
        </label>
        <div className="mt-1 flex items-center justify-between gap-2">
          <select
            id="hero-guests"
            value={guests}
            onChange={(event) => onGuestsChange(event.target.value)}
            className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent font-sans text-base text-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 sm:text-sm"
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
        onClick={onSearch}
        disabled={!datesValid}
        className={cn(
          "group col-span-2 flex h-16 items-center justify-center gap-2 px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:h-auto sm:min-w-[208px]",
          datesValid
            ? "bg-stone-900 text-white hover:bg-stone-800"
            : "cursor-not-allowed bg-stone-300 text-stone-700"
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
  ) : (
    <div className="px-5 py-6 sm:px-6">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-stone-600">
        Reservations
      </p>
      <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-stone-700">
        Online booking is temporarily unavailable. Please contact us directly to
        reserve your stay.
      </p>
    </div>
  )

  return (
    <div className="bg-canvas-warm shadow-[0_28px_70px_-28px_rgba(0,0,0,0.8)] ring-1 ring-black/5">
      {inner}
    </div>
  )
}

function Facts({ items, className }: { items: string[]; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-white/80",
        className
      )}
    >
      {items.map((fact, index) => (
        <span key={fact} className="flex items-center gap-3">
          {index > 0 && (
            <span aria-hidden className="hidden text-white/40 sm:inline">
              ·
            </span>
          )}
          {fact}
        </span>
      ))}
    </div>
  )
}

function CornerCaption({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 hidden text-right xl:block",
        className
      )}
    >
      <span aria-hidden className="mb-4 ml-auto block h-px w-12 bg-white/30" />
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-white/70">
        Garden &amp; Terrace
      </p>
      <p className="mt-2 font-sans text-[11px] tracking-[0.16em] text-white/60">
        5°58′N · 80°21′E
      </p>
    </div>
  )
}

export function HeroSection() {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState("2")

  const datesValid =
    checkIn !== undefined && checkOut !== undefined && checkOut > checkIn

  const barProps = {
    checkIn,
    checkOut,
    guests,
    datesValid,
    onCheckInChange: setCheckIn,
    onCheckOutChange: setCheckOut,
    onGuestsChange: setGuests,
  }

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
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            sizes="100vw"
            preload
            aria-hidden
            className="object-cover object-[center_35%]"
          />
        </div>

        {/* Cinematic scrims: keep the nav and lower type legible without flattening the photo. */}
        <div aria-hidden className="absolute inset-0 bg-black/15" />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.48)_32%,rgba(0,0,0,0)_68%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_78%_at_0%_100%,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.26)_46%,rgba(0,0,0,0)_78%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.16)_38%,rgba(0,0,0,0)_66%)] sm:block"
        />

        <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-6 pt-28 sm:px-12 sm:pb-10 lg:pb-12">
          <div className="max-w-3xl xl:max-w-none">
            <BlurFade direction="up" offset={18} blur="6px" delay={0.1} duration={0.9}>
              <div className="flex flex-col xl:flex-row xl:items-baseline xl:gap-8">
                <h1
                  id="hero-heading"
                  className="font-serif text-[clamp(4.25rem,12vw,10rem)] font-normal leading-[0.84] tracking-[-0.030em] text-white"
                >
                  Le Palme
                  <span className="sr-only"> Ahangama</span>
                </h1>
                <p className="mt-3 shrink-0 font-serif text-[clamp(1.2rem,2vw,1.85rem)] italic leading-snug text-white/85 xl:mt-0">
                  A garden by the southern sea
                </p>
              </div>
            </BlurFade>

            <BlurFade direction="up" offset={12} blur="4px" delay={0.3} duration={0.8}>
              <p className="mt-6 max-w-md text-pretty font-sans text-[13px] leading-relaxed text-white/85 sm:mt-8 sm:text-[15px]">
                {DESCRIPTION}
              </p>
            </BlurFade>

            <BlurFade direction="up" offset={8} blur="2px" delay={0.44} duration={0.8}>
              <Facts
                items={[LOCATION, ...HERO_FACTS]}
                className="mt-6 max-w-3xl border-t border-white/20 pt-4 sm:mt-8"
              />
            </BlurFade>
          </div>

          <BlurFade
            direction="up"
            offset={18}
            blur="6px"
            delay={0.62}
            duration={0.85}
            className="mt-8 w-full max-w-3xl sm:mt-10"
          >
            <BookingBar {...barProps} onSearch={handleSearch} />
          </BlurFade>

          <CornerCaption className="bottom-12 right-12 xl:bottom-16" />
        </div>
      </section>
    </MotionConfig>
  )
}
