"use client"

import { useState, useMemo, useEffect } from "react"
import { differenceInDays } from "date-fns"
import { Check } from "lucide-react"
import { DateStep, type RoomSelection } from "./DateStep"
import { ExtrasStep, type ExtrasData, type ExtrasPricing } from "./ExtrasStep"
import { GuestDetailsStep, type GuestData } from "./GuestDetailsStep"
import { PaymentReview } from "./PaymentReview"
import { BoardStep } from "./BoardStep"
import { BOARD_PRICE_PER_NIGHT, surfboardTotalForDays, SURFBOARD_TIERS } from "@/lib/constants"
import type { BoardPlan } from "@/lib/constants"
import { cn, formatCurrency, rentalDays } from "@/lib/utils"

type RoomCategory = { id: string; name: string; base_price_usd: number; max_occupancy: number; description: string | null; image_url: string | null }

type VehicleCategory = { id: string; name: string; pricePerDay: number; subtitle?: string }

type PricingData = {
  surfboardPricePerDay: number
  transferPrice: number
  surchargePct: number
  motorbikes: VehicleCategory[]
  cars: VehicleCategory[]
}

type BookingWizardProps = {
  categories: RoomCategory[]
  pricing: PricingData
  defaultCategoryId?: string
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultGuests?: string
}

type WizardData = {
  checkIn: string
  checkOut: string
  roomSelections: RoomSelection[]
  boardPlan: BoardPlan
  extras: ExtrasData
  guest: GuestData
}

const defaultExtras: ExtrasData = {
  surfboardQty: 0,
  surfboardStart: "", surfboardEnd: "",
  items: [],
  transferNeeded: false, transferDirection: "arrival",
  flightNumber: "", transferTime: "",
}

const defaultGuest: GuestData = {
  fullName: "", email: "", phone: "", nationality: "", nic_passport: "", numGuests: 1,
}

// bk01/bk05: hero puts `guests` (1–6) in the URL — use it to pre-fill party size
function parseGuestsParam(v?: string): number | undefined {
  const n = Number.parseInt(v ?? "", 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.min(20, n)
}

const steps = [
  { num: 1, label: "Dates & Rooms" },
  { num: 2, label: "Board Plan" },
  { num: 3, label: "Extras" },
  { num: 4, label: "Guest" },
  { num: 5, label: "Review & Pay" },
]

const STORAGE_KEY = "booking_wizard_data"

function extrasPricing(p: PricingData): ExtrasPricing {
  return {
    surfboardPricePerDay: p.surfboardPricePerDay,
    motorbikes: p.motorbikes,
    cars: p.cars,
  }
}

export function BookingWizard({ categories, pricing, defaultCategoryId, defaultCheckIn, defaultCheckOut, defaultGuests }: BookingWizardProps) {
  const urlGuests = parseGuestsParam(defaultGuests)
  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          return parsed.step ?? 1
        }
      } catch {}
    }
    return 1
  })
  const [data, setData] = useState<WizardData>(() => {
    const fallback: WizardData = {
      checkIn: defaultCheckIn || "",
      checkOut: defaultCheckOut || "",
      roomSelections: [],
      boardPlan: "room_only",
      extras: defaultExtras,
      guest: { ...defaultGuest, numGuests: urlGuests ?? 1 },
    }
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.data) {
            return {
              ...fallback,
              ...parsed.data,
              extras: { ...defaultExtras, ...(parsed.data.extras ?? {}), items: parsed.data.extras?.items ?? [] },
              // bk01: the hero's `guests` param always wins over stale session data
              guest: { ...defaultGuest, ...parsed.data.guest, ...(urlGuests !== undefined ? { numGuests: urlGuests } : {}) },
            }
          }
        }
      } catch {}
    }
    return fallback
  })

  const [liveExtras, setLiveExtras] = useState<ExtrasData | null>(null)
  const [liveBoardPlan, setLiveBoardPlan] = useState<BoardPlan | null>(null)

  function clearStorage() {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data })) } catch {}
  }, [step, data])

  function updateData(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  const nights = useMemo(() => {
    if (!data.checkIn || !data.checkOut) return 0
    return differenceInDays(new Date(data.checkOut), new Date(data.checkIn))
  }, [data.checkIn, data.checkOut])

  const roomTotal = useMemo(() => {
    return data.roomSelections.reduce((sum, sel) => {
      return sum + Number(sel.basePrice) * sel.quantity * Math.max(0, nights)
    }, 0)
  }, [data.roomSelections, nights])

  const totalRooms = useMemo(() => {
    return data.roomSelections.reduce((sum, sel) => sum + sel.quantity, 0)
  }, [data.roomSelections])

  // Use live board plan when on step 2, otherwise use saved data
  const activeBoardPlan = step === 2 && liveBoardPlan ? liveBoardPlan : data.boardPlan

  const boardTotal = useMemo(() => {
    return BOARD_PRICE_PER_NIGHT(activeBoardPlan) * nights * totalRooms
  }, [activeBoardPlan, nights, totalRooms])

  // Use live extras when on step 3, otherwise use saved data
  const activeExtras = step === 3 && liveExtras ? liveExtras : data.extras

  const equipmentTotal = useMemo(() => {
    const surfDays = rentalDays(activeExtras.surfboardStart, activeExtras.surfboardEnd, nights)
    const surfTotal = activeExtras.surfboardQty * surfboardTotalForDays(surfDays, pricing.surfboardPricePerDay, SURFBOARD_TIERS)
    return surfTotal
  }, [activeExtras.surfboardQty, activeExtras.surfboardStart, activeExtras.surfboardEnd, pricing.surfboardPricePerDay, nights])

  const vehiclesTotal = useMemo(() => {
    const lookup = new Map<string, VehicleCategory>()
    for (const m of pricing.motorbikes) lookup.set(m.id, m)
    for (const c of pricing.cars) lookup.set(c.id, c)
    return activeExtras.items.reduce((sum, it) => {
      const cat = lookup.get(it.categoryId)
      if (!cat) return sum
      const days = rentalDays(it.start, it.end, nights)
      return sum + it.qty * cat.pricePerDay * days
    }, 0)
  }, [activeExtras.items, pricing.motorbikes, pricing.cars, nights])

  const transferTotal = useMemo(() => {
    return activeExtras.transferNeeded ? pricing.transferPrice : 0
  }, [activeExtras.transferNeeded, pricing.transferPrice])

  const grandTotal = useMemo(() => {
    const subtotal = roomTotal + boardTotal + equipmentTotal + vehiclesTotal + transferTotal
    return subtotal * (1 + pricing.surchargePct / 100)
  }, [roomTotal, boardTotal, equipmentTotal, vehiclesTotal, transferTotal, pricing.surchargePct])

  const showPriceBar = step > 1 || (step === 1 && data.roomSelections.length > 0)
  const subtotal = roomTotal + boardTotal + equipmentTotal + vehiclesTotal + transferTotal

  // bk05: party size is capped at the summed max occupancy of the selected rooms
  const maxGuests = data.roomSelections.reduce((sum, sel) => sum + sel.maxOccupancy * sel.quantity, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              type="button"
              disabled={s.num > step}
              onClick={() => s.num < step && setStep(s.num)}
              className={cn(
                "flex size-10 items-center justify-center text-sm font-sans font-medium transition-colors",
                s.num < step && "bg-stone-900 text-white cursor-pointer",
                s.num === step && "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900",
                s.num > step && "bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-default",
              )}
            >
              {s.num < step ? <Check className="size-5" /> : s.num}
            </button>
            <span className={cn(
              "text-sm font-sans font-medium hidden sm:inline",
              s.num <= step ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500",
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn(
                "hidden sm:block h-px w-10 mx-1",
                s.num < step ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-800",
              )} />
            )}
          </div>
        ))}
      </div>

      {showPriceBar && (
        <div className="sticky top-0 z-10 -mx-6 px-6 py-2.5 bg-white/90 dark:bg-stone-950/90 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-sm font-sans">
          <span className="text-stone-500 dark:text-stone-400">
            {step === 1 && "Current selection"}
            {step === 2 && "Room total"}
            {step === 3 && "Room + Board total"}
            {step === 4 && "Room + Board + Extras total"}
            {step === 5 && "Grand total"}
          </span>
          <div className="flex items-center gap-3">
            {step > 1 && step < 5 && (
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Subtotal: {formatCurrency(subtotal)}
              </span>
            )}
            <span className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {step === 5 ? formatCurrency(grandTotal) : formatCurrency(subtotal)}
            </span>
          </div>
        </div>
      )}

      {step === 1 && (
        <DateStep
          categories={categories}
          onChange={(stepData) => {
            updateData({
              checkIn: stepData.checkIn,
              checkOut: stepData.checkOut,
              roomSelections: stepData.roomSelections,
            })
          }}
          onNext={(stepData) => {
            updateData({
              checkIn: stepData.checkIn,
              checkOut: stepData.checkOut,
              roomSelections: stepData.roomSelections,
            })
            setStep(2)
          }}
          defaultCategoryId={defaultCategoryId}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
        />
      )}

      {step === 2 && (
        <BoardStep
          initialPlan={data.boardPlan}
          nights={nights}
          totalRooms={totalRooms}
          onChange={(plan) => setLiveBoardPlan(plan)}
          onNext={(boardPlan) => {
            updateData({ boardPlan })
            setLiveBoardPlan(null)
            setStep(3)
          }}
          onBack={() => { setLiveBoardPlan(null); setStep(1) }}
        />
      )}

      {step === 3 && (
        <ExtrasStep
          defaultCheckIn={data.checkIn}
          defaultCheckOut={data.checkOut}
          nights={nights}
          pricing={extrasPricing(pricing)}
          onChange={(extras) => setLiveExtras(extras)}
          initialData={data.extras}
          onNext={(extras) => {
            updateData({ extras })
            setLiveExtras(null)
            setStep(4)
          }}
          onBack={() => { setLiveExtras(null); setStep(2) }}
        />
      )}

      {step === 4 && (
        <GuestDetailsStep
          initialData={data.guest}
          maxGuests={maxGuests}
          onNext={(guest) => {
            updateData({ guest })
            setStep(5)
          }}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <PaymentReview
          roomSelections={data.roomSelections}
          checkIn={data.checkIn}
          checkOut={data.checkOut}
          boardPlan={data.boardPlan}
          roomTotal={roomTotal}
          boardTotal={boardTotal}
          equipmentTotal={equipmentTotal}
          vehiclesTotal={vehiclesTotal}
          transferTotal={transferTotal}
          surchargePct={pricing.surchargePct}
          grandTotal={grandTotal}
          guest={data.guest}
          extras={data.extras}
          pricing={pricing}
          totalRooms={totalRooms}
          nights={nights}
          onBack={() => setStep(4)}
          onSuccess={clearStorage}
        />
      )}
    </div>
  )
}
