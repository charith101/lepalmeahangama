"use client"

import { useState } from "react"
import { Bike, Car, CalendarIcon, Icon, Plane } from "lucide-react"
import { surfboard } from "@lucide/lab"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { extrasSchema } from "@/lib/validations"

export type ExtrasData = {
  surfboardQty: number
  bicycleQty: number
  equipmentStart: string
  equipmentEnd: string
  transferNeeded: boolean
  transferDirection: string
  flightNumber: string
  transferTime: string
}

type ExtrasStepProps = {
  defaultCheckIn: string
  defaultCheckOut: string
  onNext: (data: ExtrasData) => void
  onBack: () => void
  initialData?: Partial<ExtrasData>
}

const SurfboardIcon = ({ className }: { className?: string }) => (
  <Icon iconNode={surfboard} className={className} />
)

function QtyStepper({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-7 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
        disabled={value <= 0}
      >
        -
      </button>
      <span className="w-6 text-center text-sm font-sans font-medium text-stone-900 dark:text-stone-100">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}

export function ExtrasStep({ defaultCheckIn, defaultCheckOut, onNext, onBack, initialData }: ExtrasStepProps) {
  const [surfboardQty, setSurfboardQty] = useState(initialData?.surfboardQty ?? 0)
  const [bicycleQty, setBicycleQty] = useState(initialData?.bicycleQty ?? 0)
  const [equipmentStart, setEquipmentStart] = useState(initialData?.equipmentStart ?? defaultCheckIn)
  const [equipmentEnd, setEquipmentEnd] = useState(initialData?.equipmentEnd ?? defaultCheckOut)
  const [transferNeeded, setTransferNeeded] = useState(initialData?.transferNeeded ?? false)
  const [transferDirection, setTransferDirection] = useState(initialData?.transferDirection ?? "arrival")
  const [flightNumber, setFlightNumber] = useState(initialData?.flightNumber ?? "")
  const [transferTime, setTransferTime] = useState(initialData?.transferTime ?? "")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleNext() {
    const result = extrasSchema.safeParse({
      surfboardQty, bicycleQty, equipmentStart, equipmentEnd,
      transferNeeded, transferDirection, flightNumber, transferTime,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] && !errs[String(issue.path[0])]) {
          errs[String(issue.path[0])] = issue.message
        }
      }
      setFieldErrors(errs)
      return
    }

    onNext(result.data)
  }

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
              <div className="size-10 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <SurfboardIcon className="size-5 text-stone-900 dark:text-stone-100" />
              </div>
              <div>
                <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Surfboard</p>
                <p className="text-xs font-sans text-stone-500 dark:text-stone-400">$15/day</p>
              </div>
            </div>
            <QtyStepper value={surfboardQty} onChange={(v) => { setSurfboardQty(v); setFieldErrors((p) => ({ ...p, surfboardQty: "" })) }} />
          </div>

          <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <Bike className="size-5 text-stone-900 dark:text-stone-100" />
              </div>
              <div>
                <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Bicycle</p>
                <p className="text-xs font-sans text-stone-500 dark:text-stone-400">$5/day</p>
              </div>
            </div>
            <QtyStepper value={bicycleQty} onChange={(v) => { setBicycleQty(v); setFieldErrors((p) => ({ ...p, bicycleQty: "" })) }} />
          </div>
        </div>

        {(surfboardQty > 0 || bicycleQty > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div data-invalid={!!fieldErrors.equipmentStart || undefined}>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Rental start *</label>
              <Popover>
                <PopoverTrigger className={cn(
                  "flex h-9 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
                  !equipmentStart && "text-stone-400 dark:text-stone-500",
                  fieldErrors.equipmentStart && "border-red-500"
                )}>
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  {equipmentStart ? format(new Date(equipmentStart + "T12:00:00"), "PPP") : "Pick start date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={equipmentStart ? new Date(equipmentStart + "T12:00:00") : undefined}
                    onSelect={(d) => { setEquipmentStart(d ? format(d, "yyyy-MM-dd") : ""); setFieldErrors((p) => ({ ...p, equipmentStart: "" })) }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div data-invalid={!!fieldErrors.equipmentEnd || undefined}>
              <label className="text-xs font-sans text-stone-500 dark:text-stone-400 mb-1.5 block">Rental end *</label>
              <Popover>
                <PopoverTrigger className={cn(
                  "flex h-9 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
                  !equipmentEnd && "text-stone-400 dark:text-stone-500",
                  fieldErrors.equipmentEnd && "border-red-500"
                )}>
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  {equipmentEnd ? format(new Date(equipmentEnd + "T12:00:00"), "PPP") : "Pick end date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={equipmentEnd ? new Date(equipmentEnd + "T12:00:00") : undefined}
                    onSelect={(d) => { setEquipmentEnd(d ? format(d, "yyyy-MM-dd") : ""); setFieldErrors((p) => ({ ...p, equipmentEnd: "" })) }}
                    disabled={(date) => !equipmentStart || date <= new Date(equipmentStart + "T12:00:00")}
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.equipmentEnd && (
                <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.equipmentEnd}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border border-stone-200 dark:border-stone-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <Car className="size-5 text-stone-900 dark:text-stone-100" />
            </div>
            <div>
              <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Airport Transfer</p>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400">$30 &middot; CMB &#8594; Ahangama</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTransferNeeded(!transferNeeded)}
            className={`relative inline-flex h-6 w-11 items-center transition-colors shrink-0 ${transferNeeded ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-800"}`}
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
                onChange={(e) => { setTransferDirection(e.target.value); setFieldErrors((p) => ({ ...p, transferDirection: "" })) }}
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
