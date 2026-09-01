"use client"

import { useState, useMemo, useEffect } from "react"
import { differenceInDays } from "date-fns"
import { Check } from "lucide-react"
import { DateStep, type RoomSelection } from "./DateStep"
import { ExtrasStep, type ExtrasData } from "./ExtrasStep"
import { GuestDetailsStep, type GuestData } from "./GuestDetailsStep"
import { PaymentReview } from "./PaymentReview"
import { BoardStep } from "./BoardStep"
import { BOARD_PRICE_PER_NIGHT, type BoardPlan } from "@/lib/constants"
import { cn, formatCurrency, rentalDays } from "@/lib/utils"

type RoomCategory = { id: string; name: string; base_price_usd: number; max_occupancy: number; description: string | null; image_url: string | null }

type PricingData = {
  surfboardPricePerDay: number
  bicyclePricePerDay: number
  transferPrice: number
  surchargePct: number
}

type BookingWizardProps = {
  categories: RoomCategory[]
  pricing: PricingData
  defaultCategoryId?: string
  defaultCheckIn?: string
  defaultCheckOut?: string
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
  surfboardQty: 0, bicycleQty: 0,
  surfboardStart: "", surfboardEnd: "",
  bicycleStart: "", bicycleEnd: "",
  transferNeeded: false, transferDirection: "arrival",
  flightNumber: "", transferTime: "",
}

const defaultGuest: GuestData = {
  fullName: "", email: "", phone: "", nationality: "", nic_passport: "",
}

const steps = [
  { num: 1, label: "Dates & Rooms" },
  { num: 2, label: "Board Plan" },
  { num: 3, label: "Extras" },
  { num: 4, label: "Guest" },
  { num: 5, label: "Review & Pay" },
]

const STORAGE_KEY = "booking_wizard_data"

export function BookingWizard({ categories, pricing, defaultCategoryId, defaultCheckIn, defaultCheckOut }: BookingWizardProps) {
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
      guest: defaultGuest,
    }
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.data) {
            // ponytail: merge so older saved sessions get boardPlan + per-type dates
            return {
              ...fallback,
              ...parsed.data,
              extras: { ...defaultExtras, ...parsed.data.extras },
              guest: { ...defaultGuest, ...parsed.data.guest },
            }
          }
        }
      } catch {}
    }
    return fallback
  })

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

  const boardTotal = useMemo(() => {
    return BOARD_PRICE_PER_NIGHT(data.boardPlan) * nights * totalRooms
  }, [data.boardPlan, nights, totalRooms])

  const equipmentTotal = useMemo(() => {
    const surf = data.extras.surfboardQty * pricing.surfboardPricePerDay * rentalDays(data.extras.surfboardStart, data.extras.surfboardEnd, nights)
    const bike = data.extras.bicycleQty * pricing.bicyclePricePerDay * rentalDays(data.extras.bicycleStart, data.extras.bicycleEnd, nights)
    return surf + bike
  }, [data.extras, pricing, nights])

  const transferTotal = useMemo(() => {
    return data.extras.transferNeeded ? pricing.transferPrice : 0
  }, [data.extras.transferNeeded, pricing.transferPrice])

  const grandTotal = useMemo(() => {
    const subtotal = roomTotal + boardTotal + equipmentTotal + transferTotal
    return subtotal * (1 + pricing.surchargePct / 100)
  }, [roomTotal, boardTotal, equipmentTotal, transferTotal, pricing.surchargePct])

  const showPriceBar = step > 1 || (step === 1 && data.roomSelections.length > 0)

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
                "flex size-8 items-center justify-center text-xs font-sans font-medium transition-colors",
                s.num < step && "bg-stone-900 text-white cursor-pointer",
                s.num === step && "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900",
                s.num > step && "bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-default",
              )}
            >
              {s.num < step ? <Check className="size-4" /> : s.num}
            </button>
            <span className={cn(
              "text-xs font-sans font-medium hidden sm:inline",
              s.num <= step ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500",
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn(
                "hidden sm:block h-px w-8 mx-1",
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
                Subtotal: {formatCurrency(roomTotal + boardTotal + equipmentTotal + transferTotal)}
              </span>
            )}
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {step === 5 ? formatCurrency(grandTotal) : formatCurrency(roomTotal + boardTotal + equipmentTotal + transferTotal)}
            </span>
          </div>
        </div>
      )}

      {step === 1 && (
        <DateStep
          categories={categories}
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
          onNext={(boardPlan) => {
            updateData({ boardPlan })
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <ExtrasStep
          defaultCheckIn={data.checkIn}
          defaultCheckOut={data.checkOut}
          initialData={data.extras}
          onNext={(extras) => {
            updateData({ extras })
            setStep(4)
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <GuestDetailsStep
          initialData={data.guest}
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
