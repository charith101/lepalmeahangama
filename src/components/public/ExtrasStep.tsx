"use client"

import { useState, useEffect } from "react"
import { Car, CalendarIcon, Icon, Motorbike, Plane } from "lucide-react"
import { surfboard } from "@lucide/lab"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { extrasSchema } from "@/lib/validations"
import { surfboardTotalForDays, SURFBOARD_TIERS } from "@/lib/constants"
import { rentalDays, formatCurrency } from "@/lib/utils"

export type ExtrasItem = { categoryId: string; qty: number; start: string; end: string }

export type ExtrasData = {
  surfboardQty: number
  surfboardStart: string
  surfboardEnd: string
  items: ExtrasItem[]
  transferNeeded: boolean
  transferDirection: "arrival" | "departure"
  flightNumber: string
  transferTime: string
}

export type ExtrasPricing = {
  surfboardPricePerDay: number
  motorbikes: Array<{ id: string; name: string; pricePerDay: number; subtitle?: string }>
  cars: Array<{ id: string; name: string; pricePerDay: number; subtitle?: string }>
}

type ExtrasStepProps = {
  defaultCheckIn: string
  defaultCheckOut: string
  nights: number
  pricing: ExtrasPricing
  currentTotal: number
  onChange?: (data: ExtrasData) => void
  onNext: (data: ExtrasData) => void
  onBack: () => void
  initialData?: Partial<ExtrasData>
}

const SurfboardIcon = ({ className }: { className?: string }) => (
  <Icon iconNode={surfboard} className={className} />
)

function DateRangeField({
  label, start, end, onStart, onEnd, startError, endError,
  onClearStartError, onClearEndError,
}: {
  label: string
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
  startError?: string
  endError?: string
  onClearStartError?: () => void
  onClearEndError?: () => void
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div data-invalid={!!startError || undefined}>
        <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">{label} start *</label>
        <Popover>
          <PopoverTrigger className={cn(
            "flex h-9 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
            !start && "text-stone-400 dark:text-stone-500",
            startError && "border-red-500"
          )}>
            <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
            {start ? format(new Date(start + "T12:00:00"), "PPP") : "Pick start date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={start ? new Date(start + "T12:00:00") : undefined}
              onSelect={(d) => { onStart(d ? format(d, "yyyy-MM-dd") : ""); onClearStartError?.(); }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </PopoverContent>
        </Popover>
        {startError && (
          <p className="mt-1 text-xs text-red-500 font-sans" role="alert">{startError}</p>
        )}
      </div>
      <div data-invalid={!!endError || undefined}>
        <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">{label} end *</label>
        <Popover>
          <PopoverTrigger className={cn(
            "flex h-9 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
            !end && "text-stone-400 dark:text-stone-500",
            endError && "border-red-500"
          )}>
            <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
            {end ? format(new Date(end + "T12:00:00"), "PPP") : "Pick end date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={end ? new Date(end + "T12:00:00") : undefined}
              onSelect={(d) => { onEnd(d ? format(d, "yyyy-MM-dd") : ""); onClearEndError?.(); }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (start ? date <= new Date(start + "T12:00:00") : false)}
            />
          </PopoverContent>
        </Popover>
        {endError && (
          <p className="mt-1 text-xs text-red-500 font-sans" role="alert">{endError}</p>
        )}
      </div>
    </div>
  )
}

function QtyStepper({ value, onChange, max = 20 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-7 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
        aria-label="Decrease"
      >
        -
      </button>
      <span className="w-6 text-center text-sm font-sans font-medium text-stone-900 dark:text-stone-100">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

export function ExtrasStep({ defaultCheckIn, defaultCheckOut, nights, pricing, currentTotal, onChange, onNext, onBack, initialData }: ExtrasStepProps) {
  const [surfboardQty, setSurfboardQty] = useState(initialData?.surfboardQty ?? 0)
  const [surfboardStart, setSurfboardStart] = useState(initialData?.surfboardStart ?? defaultCheckIn)
  const [surfboardEnd, setSurfboardEnd] = useState(initialData?.surfboardEnd ?? defaultCheckOut)

  const [motorbikeModel, setMotorbikeModel] = useState(initialData?.items?.find((it) => pricing.motorbikes.some((m) => m.id === it.categoryId))?.categoryId ?? "")
  const [motorbikeQty, setMotorbikeQty] = useState(initialData?.items?.find((it) => pricing.motorbikes.some((m) => m.id === it.categoryId))?.qty ?? 1)
  const [motorbikeStart, setMotorbikeStart] = useState(initialData?.items?.find((it) => pricing.motorbikes.some((m) => m.id === it.categoryId))?.start ?? defaultCheckIn)
  const [motorbikeEnd, setMotorbikeEnd] = useState(initialData?.items?.find((it) => pricing.motorbikes.some((m) => m.id === it.categoryId))?.end ?? defaultCheckOut)

  const [carModel, setCarModel] = useState(initialData?.items?.find((it) => pricing.cars.some((c) => c.id === it.categoryId))?.categoryId ?? "")
  const [carQty, setCarQty] = useState(initialData?.items?.find((it) => pricing.cars.some((c) => c.id === it.categoryId))?.qty ?? 1)
  const [carStart, setCarStart] = useState(initialData?.items?.find((it) => pricing.cars.some((c) => c.id === it.categoryId))?.start ?? defaultCheckIn)
  const [carEnd, setCarEnd] = useState(initialData?.items?.find((it) => pricing.cars.some((c) => c.id === it.categoryId))?.end ?? defaultCheckOut)

  const [transferNeeded, setTransferNeeded] = useState(initialData?.transferNeeded ?? false)
  const [transferDirection, setTransferDirection] = useState(initialData?.transferDirection ?? "arrival")
  const [flightNumber, setFlightNumber] = useState(initialData?.flightNumber ?? "")
  const [transferTime, setTransferTime] = useState(initialData?.transferTime ?? "")

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Build items array and fire onChange for real-time price updates
  function buildExtrasData(): ExtrasData {
    const items: ExtrasItem[] = []
    if (motorbikeModel) {
      items.push({ categoryId: motorbikeModel, qty: motorbikeQty, start: motorbikeStart, end: motorbikeEnd })
    }
    if (carModel) {
      items.push({ categoryId: carModel, qty: carQty, start: carStart, end: carEnd })
    }
    return {
      surfboardQty,
      surfboardStart,
      surfboardEnd,
      items,
      transferNeeded,
      transferDirection,
      flightNumber,
      transferTime,
    }
  }

  useEffect(() => {
    onChange?.(buildExtrasData())
  }, [
    surfboardQty, surfboardStart, surfboardEnd,
    motorbikeModel, motorbikeQty, motorbikeStart, motorbikeEnd,
    carModel, carQty, carStart, carEnd,
    transferNeeded, transferDirection, flightNumber, transferTime,
  ])

  // --- Price calculations ---
  const surfboardDays = rentalDays(surfboardStart, surfboardEnd, nights)
  const surfboardPrice = surfboardQty > 0 ? surfboardQty * surfboardTotalForDays(surfboardDays, pricing.surfboardPricePerDay, SURFBOARD_TIERS) : 0

  const motorbikeDays = motorbikeModel ? rentalDays(motorbikeStart, motorbikeEnd, nights) : 0
  const motorbikePrice = motorbikeModel ? (() => {
    const m = pricing.motorbikes.find((x) => x.id === motorbikeModel)
    return m ? m.pricePerDay * motorbikeDays * motorbikeQty : 0
  })() : 0

  const carDays = carModel ? rentalDays(carStart, carEnd, nights) : 0
  const carPrice = carModel ? (() => {
    const c = pricing.cars.find((x) => x.id === carModel)
    return c ? c.pricePerDay * carDays * carQty : 0
  })() : 0

  const extrasTotal = surfboardPrice + motorbikePrice + carPrice

  const selectedMotorbike = pricing.motorbikes.find((m) => m.id === motorbikeModel)
  const selectedCar = pricing.cars.find((c) => c.id === carModel)

  function handleNext() {
    const data = buildExtrasData()
    const result = extrasSchema.safeParse(data)
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path
        const top = String(path[0] ?? "")
        if (top && !errs[top]) {
          // Map Zod messages to friendlier text
          const msg = issue.message
          if (msg.includes("End date must be after start date")) {
            errs[top] = "End date must be after the start date"
          } else if (msg.includes("Start date is required")) {
            errs[top] = "Please select a start date"
          } else if (msg.includes("End date is required")) {
            errs[top] = "Please select an end date"
          } else {
            errs[top] = msg
          }
        }
      }
      setFieldErrors(errs)
      return
    }

    // Additional client-side date validation for better UX
    const dateErrs: Record<string, string> = {}
    if (data.surfboardQty > 0) {
      if (!data.surfboardStart || !data.surfboardEnd) {
        dateErrs.surfboardEnd = "Please select both start and end dates for surfboard rental"
      } else if (new Date(data.surfboardEnd) <= new Date(data.surfboardStart)) {
        dateErrs.surfboardEnd = "Surfboard end date must be after the start date"
      }
    }
    for (const item of data.items) {
      if (!item.start || !item.end) {
        dateErrs[item.categoryId] = "Please select both start and end dates"
      } else if (new Date(item.end) <= new Date(item.start)) {
        dateErrs[item.categoryId] = "End date must be after the start date"
      }
    }
    if (Object.keys(dateErrs).length > 0) {
      setFieldErrors(dateErrs)
      return
    }

    setFieldErrors({})
    onNext(result.data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Add Extras</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">Enhance your stay with equipment rentals and airport transfer.</p>
      </div>

      {/* --- Surfboards --- */}
      <div className="space-y-3">
        <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <SurfboardIcon className="size-6 text-stone-900 dark:text-stone-100" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Surfboard</p>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
                {surfboardDays > 0 ? `${surfboardDays} day${surfboardDays > 1 ? "s" : ""} · ` : ""}
                Tiered: $25/day (1–6) · $14 (7–13) · $12 (14–20) · $11 (21+)
              </p>
            </div>
            <QtyStepper value={surfboardQty} onChange={(v) => { setSurfboardQty(v); setFieldErrors((p) => ({ ...p, surfboardQty: "" })) }} />
          </div>

          {surfboardQty > 0 && (
            <div className="space-y-3">
              <DateRangeField
                label="Surfboard rental"
                start={surfboardStart}
                end={surfboardEnd}
                onStart={setSurfboardStart}
                onEnd={setSurfboardEnd}
                startError={fieldErrors.surfboardStart}
                endError={fieldErrors.surfboardEnd}
                onClearStartError={() => setFieldErrors((p) => { const n = { ...p }; delete n.surfboardStart; return n })}
                onClearEndError={() => setFieldErrors((p) => { const n = { ...p }; delete n.surfboardEnd; return n })}
              />
              <div className="flex items-center gap-2 text-sm font-sans">
                <span className="text-stone-500 dark:text-stone-400">
                  {surfboardQty} board{surfboardQty > 1 ? "s" : ""} × {surfboardDays} day{surfboardDays > 1 ? "s" : ""}
                </span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {formatCurrency(surfboardPrice)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">added to total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Motorbikes --- */}
      <div className="space-y-3">
        <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <Motorbike className="size-6 text-stone-900 dark:text-stone-100" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Motorbike</p>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
                {selectedMotorbike ? `${formatCurrency(selectedMotorbike.pricePerDay)}/day` : "Select a model"}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Model *</label>
              <select
                value={motorbikeModel}
                onChange={(e) => {
                  setMotorbikeModel(e.target.value)
                  if (e.target.value && !motorbikeStart) setMotorbikeStart(defaultCheckIn)
                  if (e.target.value && !motorbikeEnd) setMotorbikeEnd(defaultCheckOut)
                }}
                className="w-full h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="">None</option>
                {pricing.motorbikes.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — ${m.pricePerDay}/day</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Quantity</label>
              <QtyStepper value={motorbikeQty} onChange={setMotorbikeQty} max={10} />
            </div>
          </div>

          {motorbikeModel && (
            <div className="space-y-3">
              <DateRangeField
                label="Motorbike rental"
                start={motorbikeStart}
                end={motorbikeEnd}
                onStart={setMotorbikeStart}
                onEnd={setMotorbikeEnd}
                startError={fieldErrors[motorbikeModel]}
                endError={fieldErrors[motorbikeModel]}
                onClearStartError={() => setFieldErrors((p) => { const n = { ...p }; delete n[motorbikeModel]; return n })}
                onClearEndError={() => setFieldErrors((p) => { const n = { ...p }; delete n[motorbikeModel]; return n })}
              />
              <div className="flex items-center gap-2 text-sm font-sans">
                <span className="text-stone-500 dark:text-stone-400">
                  {motorbikeQty}× {selectedMotorbike?.name} · {motorbikeDays} day{motorbikeDays > 1 ? "s" : ""}
                </span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {formatCurrency(motorbikePrice)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">added to total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Cars --- */}
      <div className="space-y-3">
        <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <Car className="size-6 text-stone-900 dark:text-stone-100" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Car</p>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
                {selectedCar ? `${formatCurrency(selectedCar.pricePerDay)}/day` : "Select a model"}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Model *</label>
              <select
                value={carModel}
                onChange={(e) => {
                  setCarModel(e.target.value)
                  if (e.target.value && !carStart) setCarStart(defaultCheckIn)
                  if (e.target.value && !carEnd) setCarEnd(defaultCheckOut)
                }}
                className="w-full h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="">None</option>
                {pricing.cars.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — ${c.pricePerDay}/day</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Quantity</label>
              <QtyStepper value={carQty} onChange={setCarQty} max={10} />
            </div>
          </div>

          {carModel && (
            <div className="space-y-3">
              <DateRangeField
                label="Car rental"
                start={carStart}
                end={carEnd}
                onStart={setCarStart}
                onEnd={setCarEnd}
                startError={fieldErrors[carModel]}
                endError={fieldErrors[carModel]}
                onClearStartError={() => setFieldErrors((p) => { const n = { ...p }; delete n[carModel]; return n })}
                onClearEndError={() => setFieldErrors((p) => { const n = { ...p }; delete n[carModel]; return n })}
              />
              <div className="flex items-center gap-2 text-sm font-sans">
                <span className="text-stone-500 dark:text-stone-400">
                  {carQty}× {selectedCar?.name} · {carDays} day{carDays > 1 ? "s" : ""}
                </span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {formatCurrency(carPrice)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">added to total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Extras total summary --- */}
      {extrasTotal > 0 && (
        <div className="border border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-900 p-4">
          <div className="flex items-center justify-between text-sm font-sans">
            <span className="font-medium text-stone-900 dark:text-stone-100">Extras total</span>
            <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(extrasTotal)}</span>
          </div>
          <p className="text-xs font-sans text-stone-500 dark:text-stone-400 mt-1">
            {formatCurrency(extrasTotal)} will be added to your total
          </p>
        </div>
      )}

      {/* --- Airport Transfer --- */}
      <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <Plane className="size-6 text-stone-900 dark:text-stone-100" />
            </div>
            <div>
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Airport Transfer</p>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400">CMB → Ahangama</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTransferNeeded(!transferNeeded)}
            className={`relative inline-flex h-6 w-11 items-center transition-colors shrink-0 ${transferNeeded ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-800"}`}
            aria-pressed={transferNeeded}
          >
            <span className={`inline-block size-5 bg-white dark:bg-stone-900 transition-transform ${transferNeeded ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        {transferNeeded && (
          <div className="grid sm:grid-cols-3 gap-4 pt-1">
            <div data-invalid={!!fieldErrors.transferDirection || undefined}>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400">Direction *</label>
              <select
                value={transferDirection}
                onChange={(e) => { setTransferDirection(e.target.value as "arrival" | "departure"); setFieldErrors((p) => ({ ...p, transferDirection: "" })) }}
                className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="arrival">Arrival</option>
                <option value="departure">Departure</option>
              </select>
              {fieldErrors.transferDirection && <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.transferDirection}</p>}
            </div>
            <div data-invalid={!!fieldErrors.flightNumber || undefined}>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400">Flight number</label>
              <input
                value={flightNumber}
                onChange={(e) => { setFlightNumber(e.target.value); setFieldErrors((p) => ({ ...p, flightNumber: "" })) }}
                placeholder="e.g. UL-101"
                className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              />
              {fieldErrors.flightNumber && <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.flightNumber}</p>}
            </div>
            <div data-invalid={!!fieldErrors.transferTime || undefined}>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400">Pickup time *</label>
              <input
                type="time"
                value={transferTime}
                onChange={(e) => { setTransferTime(e.target.value); setFieldErrors((p) => ({ ...p, transferTime: "" })) }}
                className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              />
              {fieldErrors.transferTime && <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.transferTime}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">Back</button>
        <button onClick={handleNext} className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Next: Guest Details</button>
      </div>
    </div>
  )
}
