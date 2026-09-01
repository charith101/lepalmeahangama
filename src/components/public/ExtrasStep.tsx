"use client"

import { useState } from "react"
import { Bike, Car, CalendarIcon, Icon, Plane, Plus, Trash2 } from "lucide-react"
import { surfboard } from "@lucide/lab"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { extrasSchema } from "@/lib/validations"
import { SURFBOARD_TIERS } from "@/lib/constants"

export type ExtrasItem = { categoryId: string; qty: number; start: string; end: string }

// ponytail: keep the same ExtrasData shape the wizard and payment review expect.
// transferDirection is the union the schema enforces, not bare string.
export type ExtrasData = {
  surfboardQty: number
  bicycleQty: number
  surfboardStart: string
  surfboardEnd: string
  bicycleStart: string
  bicycleEnd: string
  items: ExtrasItem[]
  transferNeeded: boolean
  transferDirection: "arrival" | "departure"
  flightNumber: string
  transferTime: string
}

export type ExtrasPricing = {
  surfboardPricePerDay: number
  bicyclePricePerDay: number
  motorbikes: Array<{ id: string; name: string; pricePerDay: number; subtitle?: string }>
  cars: Array<{ id: string; name: string; pricePerDay: number; subtitle?: string }>
}

type ExtrasStepProps = {
  defaultCheckIn: string
  defaultCheckOut: string
  pricing: ExtrasPricing
  onNext: (data: ExtrasData) => void
  onBack: () => void
  initialData?: Partial<ExtrasData>
}

const SurfboardIcon = ({ className }: { className?: string }) => (
  <Icon iconNode={surfboard} className={className} />
)

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

function DateRangeField({
  label, start, end, onStart, onEnd, startError, endError,
}: {
  label: string
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
  startError?: string
  endError?: string
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
              onSelect={(d) => { onStart(d ? format(d, "yyyy-MM-dd") : ""); }}
            />
          </PopoverContent>
        </Popover>
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
              onSelect={(d) => { onEnd(d ? format(d, "yyyy-MM-dd") : ""); }}
              disabled={(date) => !start || date <= new Date(start + "T12:00:00")}
            />
          </PopoverContent>
        </Popover>
        {endError && (
          <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{endError}</p>
        )}
      </div>
    </div>
  )
}

function SurfboardTiersHint({ days }: { days: number }) {
  // ponytail: show the tier breakdown so guests aren't surprised by the price step-down.
  const tiers = SURFBOARD_TIERS.tiers
  if (days <= 0) {
    return (
      <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
        Tiered: $25/day (1–6) · $14/day (7–13) · $12/day (14–20) · $11/day (21+)
      </p>
    )
  }
  const tier = tiers.find((t) => days >= t.min_days && (t.max_days === null || days <= t.max_days)) ?? tiers[tiers.length - 1]
  return (
    <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
      {days} day{days > 1 ? "s" : ""} · ${tier.price_per_day_usd}/day (tiered rate)
    </p>
  )
}

export function ExtrasStep({ defaultCheckIn, defaultCheckOut, pricing, onNext, onBack, initialData }: ExtrasStepProps) {
  const [surfboardQty, setSurfboardQty] = useState(initialData?.surfboardQty ?? 0)
  const [bicycleQty, setBicycleQty] = useState(initialData?.bicycleQty ?? 0)
  const [surfboardStart, setSurfboardStart] = useState(initialData?.surfboardStart ?? defaultCheckIn)
  const [surfboardEnd, setSurfboardEnd] = useState(initialData?.surfboardEnd ?? defaultCheckOut)
  const [bicycleStart, setBicycleStart] = useState(initialData?.bicycleStart ?? defaultCheckIn)
  const [bicycleEnd, setBicycleEnd] = useState(initialData?.bicycleEnd ?? defaultCheckOut)
  const [items, setItems] = useState<ExtrasItem[]>(initialData?.items ?? [])
  const [transferNeeded, setTransferNeeded] = useState(initialData?.transferNeeded ?? false)
  const [transferDirection, setTransferDirection] = useState(initialData?.transferDirection ?? "arrival")
  const [flightNumber, setFlightNumber] = useState(initialData?.flightNumber ?? "")
  const [transferTime, setTransferTime] = useState(initialData?.transferTime ?? "")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [itemErrors, setItemErrors] = useState<Record<number, { start?: string; end?: string }>>({})

  function addItem(categoryId: string) {
    setItems((prev) => [
      ...prev,
      { categoryId, qty: 1, start: defaultCheckIn, end: defaultCheckOut },
    ])
  }

  function updateItem(idx: number, patch: Partial<ExtrasItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
    setItemErrors((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    setItemErrors((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  function handleNext() {
    const result = extrasSchema.safeParse({
      surfboardQty, bicycleQty, surfboardStart, surfboardEnd, bicycleStart, bicycleEnd,
      items,
      transferNeeded, transferDirection, flightNumber, transferTime,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      const itemErrs: Record<number, { start?: string; end?: string }> = {}
      for (const issue of result.error.issues) {
        const path = issue.path
        const top = path[0]
        if (top === "items" && typeof path[1] === "number") {
          const idx = path[1]
          const field = String(path[2] ?? "")
          itemErrs[idx] = { ...itemErrs[idx], [field]: issue.message }
        } else if (typeof top === "string" && top) {
          if (!errs[top]) errs[top] = issue.message
        }
      }
      setFieldErrors(errs)
      setItemErrors(itemErrs)
      return
    }
    setFieldErrors({})
    setItemErrors({})
    onNext(result.data)
  }

  const surfboardDays = Math.max(0, Math.round(
    (new Date(surfboardEnd + "T12:00:00").getTime() - new Date(surfboardStart + "T12:00:00").getTime()) / 86_400_000
  ))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Add Extras</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">Enhance your stay with equipment rentals and airport transfer.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Equipment Rental</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <SurfboardIcon className="size-6 text-stone-900 dark:text-stone-100" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Surfboard</p>
                <SurfboardTiersHint days={surfboardQty > 0 ? surfboardDays : 0} />
              </div>
            </div>
            <QtyStepper value={surfboardQty} onChange={(v) => { setSurfboardQty(v); setFieldErrors((p) => ({ ...p, surfboardQty: "" })) }} />
          </div>

          <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <Bike className="size-6 text-stone-900 dark:text-stone-100" />
              </div>
              <div>
                <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Bicycle</p>
                <p className="text-xs font-sans text-stone-500 dark:text-stone-400">${pricing.bicyclePricePerDay}/day</p>
              </div>
            </div>
            <QtyStepper value={bicycleQty} onChange={(v) => { setBicycleQty(v); setFieldErrors((p) => ({ ...p, bicycleQty: "" })) }} />
          </div>
        </div>

        {surfboardQty > 0 && (
          <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <SurfboardIcon className="size-6 text-stone-900 dark:text-stone-100" />
              </div>
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">
                Surfboard rental dates · {surfboardQty} board{surfboardQty > 1 ? "s" : ""}
              </p>
            </div>
            <DateRangeField
              label="Rental"
              start={surfboardStart}
              end={surfboardEnd}
              onStart={setSurfboardStart}
              onEnd={setSurfboardEnd}
              startError={fieldErrors.surfboardStart}
              endError={fieldErrors.surfboardEnd}
            />
          </div>
        )}

        {bicycleQty > 0 && (
          <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <Bike className="size-6 text-stone-900 dark:text-stone-100" />
              </div>
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">
                Bicycle rental dates · {bicycleQty} bike{bicycleQty > 1 ? "s" : ""}
              </p>
            </div>
            <DateRangeField
              label="Rental"
              start={bicycleStart}
              end={bicycleEnd}
              onStart={setBicycleStart}
              onEnd={setBicycleEnd}
              startError={fieldErrors.bicycleStart}
              endError={fieldErrors.bicycleEnd}
            />
          </div>
        )}
      </div>

      {/* Motorbikes */}
      <div className="space-y-3">
        <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Motorbikes</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {pricing.motorbikes.map((m) => {
            const inCart = items.some((it) => it.categoryId === m.id)
            return (
              <div key={m.id} className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <Bike className="size-6 text-stone-900 dark:text-stone-100" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 truncate">{m.name}</p>
                    <p className="text-xs font-sans text-stone-500 dark:text-stone-400">${m.pricePerDay}/day{m.subtitle ? ` · ${m.subtitle}` : ""}</p>
                  </div>
                </div>
                {inCart ? (
                  <p className="text-xs font-sans text-stone-500 dark:text-stone-400">Added below — set dates and quantity.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => addItem(m.id)}
                    className="w-full py-2 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="size-4" /> Add motorbike
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Cars */}
      <div className="space-y-3">
        <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Cars</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {pricing.cars.map((c) => {
            const inCart = items.some((it) => it.categoryId === c.id)
            return (
              <div key={c.id} className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <Car className="size-6 text-stone-900 dark:text-stone-100" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 truncate">{c.name}</p>
                    <p className="text-xs font-sans text-stone-500 dark:text-stone-400">${c.pricePerDay}/day{c.subtitle ? ` · ${c.subtitle}` : ""}</p>
                  </div>
                </div>
                {inCart ? (
                  <p className="text-xs font-sans text-stone-500 dark:text-stone-400">Added below — set dates and quantity.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => addItem(c.id)}
                    className="w-full py-2 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="size-4" /> Add car
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Items cart: each selected motorbike/car with its own date range and qty */}
      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Selected vehicles</p>
          {items.map((it, idx) => {
            const knownItem = [
              ...pricing.motorbikes.map((m) => ({ ...m, kind: "Motorbike" as const })),
              ...pricing.cars.map((c) => ({ ...c, kind: "Car" as const })),
            ].find((x) => x.id === it.categoryId)
            const errs = itemErrors[idx]
            return (
              <div key={`${it.categoryId}-${idx}`} className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                      {knownItem?.kind === "Car"
                        ? <Car className="size-6 text-stone-900 dark:text-stone-100" />
                        : <Bike className="size-6 text-stone-900 dark:text-stone-100" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 truncate">
                        {knownItem?.name ?? it.categoryId}
                      </p>
                      <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
                        {knownItem ? `$${knownItem.pricePerDay}/day` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    aria-label="Remove"
                    className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-sans text-stone-500 dark:text-stone-400">Quantity</label>
                    <div className="mt-1.5">
                      <QtyStepper value={it.qty} onChange={(v) => updateItem(idx, { qty: v })} />
                    </div>
                  </div>
                  <div className="hidden sm:block" />
                  <DateRangeField
                    label="Pickup"
                    start={it.start}
                    end={it.end}
                    onStart={(v) => updateItem(idx, { start: v })}
                    onEnd={(v) => updateItem(idx, { end: v })}
                    startError={errs?.start}
                    endError={errs?.end}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

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
