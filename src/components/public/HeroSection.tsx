"use client"
import { useState, useEffect, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, TreePalm, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function HeroSection() {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState("2")

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

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
    <header className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center animate-[pulse_5s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.08)), url('https://images.unsplash.com/photo-1535262412227-85541e910204?q=90&w=2560&auto=format&fit=crop')",
        }}
      />

      {/* <div className="relative z-10 pt-8 sm:pt-10 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-white/70 text-[11px] sm:text-xs tracking-[0.3em] uppercase font-sans">
          <span>Ahangama, Sri Lanka</span>
          <span className="hidden sm:inline">Est. 2019</span>
        </div>
      </div> */}


      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <TreePalm className={`size-10 sm:size-9 text-white/80 mb-2 mt-6 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} strokeWidth={1.5} />

        <h1 className="font-serif font-normal leading-[0.95] tracking-tight mb-6">
          <span
            className={`block text-white text-[clamp(3.5rem,11vw,8rem)] transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.35), 0 2px 10px rgba(0,0,0,0.25)" }}
          >
            Le Palme
          </span>
          <span className={`block text-white/80 text-[clamp(1.1rem,2.5vw,1.75rem)] tracking-[0.4em] uppercase font-sans mt-3 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            Ahangama
          </span>
        </h1>

        

        <p className={`max-w-md text-white/80 text-sm sm:text-base font-sans leading-relaxed -mb-6 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          A beachfront retreat where the reef break meets your doorstep.
        </p>
      </div>

      {/* Scroll cue so the lower-middle space feels purposeful */}
      <div className={`relative z-10 hidden sm:flex justify-center pb-6 transition-all duration-700 delay-[400ms] ${mounted ? "opacity-100" : "opacity-0"}`}>
        <ChevronDown className="size-5 text-white/50 animate-bounce" />
      </div>

      {/* Booking bar */}
      <div className={`relative z-10 w-full px-6 pb-12 sm:pb-16 transition-all duration-700 delay-[500ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-4xl mx-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm px-6 py-5 sm:px-8 sm:py-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Arrival
              </label>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-full items-center justify-start border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-sans text-stone-800 dark:text-stone-200 px-3 outline-none transition-[border-color] focus-visible:border-stone-400 dark:focus-visible:border-stone-500",
                    !checkIn && "text-stone-400 dark:text-stone-500"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  {checkIn ? format(checkIn, "dd MMM yyyy") : "Select date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Departure
              </label>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-full items-center justify-start border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-sans text-stone-800 dark:text-stone-200 px-3 outline-none transition-[border-color] focus-visible:border-stone-400 dark:focus-visible:border-stone-500",
                    !checkOut && "text-stone-400 dark:text-stone-500"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  {checkOut ? format(checkOut, "dd MMM yyyy") : "Select date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (checkIn ? date <= checkIn : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full sm:w-28 min-w-0">
              <label className="block text-[11px] font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Guests
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full h-10 px-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors appearance-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Guest" : "Guests"}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:pb-0">
              <button
                onClick={handleSearch}
                disabled={!datesValid}
                className={cn(
                  "block w-full sm:w-auto px-8 py-2.5 text-white text-sm font-sans font-medium transition-colors text-center whitespace-nowrap h-10",
                  datesValid
                    ? "bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700"
                    : "bg-stone-400 dark:bg-stone-600 cursor-not-allowed"
                )}
              >
                {!checkIn || !checkOut ? "Select dates" : checkOut <= checkIn ? "Invalid dates" : "Check Availability"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}