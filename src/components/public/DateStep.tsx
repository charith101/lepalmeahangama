"use client"

import { useState, useEffect, useRef } from "react"
import { CalendarIcon, Trash2, Plus, Minus, Check, BedDouble, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatCurrency } from "@/lib/utils"
import { getAvailableRooms } from "@/lib/actions/rooms"
import { dateStepSchema } from "@/lib/validations"
import Link from "next/link"

type RoomCategory = { id: string; name: string; base_price_usd: number; max_occupancy: number; description: string | null; image_url: string | null }

export type RoomSelection = {
  categoryId: string
  categoryName: string
  basePrice: number
  maxOccupancy: number
  quantity: number
  availableCount: number
  imageUrl: string | null
}

type DateStepProps = {
  categories: RoomCategory[]
  onNext: (data: { checkIn: string; checkOut: string; roomSelections: RoomSelection[] }) => void
  onChange?: (data: { checkIn: string; checkOut: string; roomSelections: RoomSelection[] }) => void
  defaultCategoryId?: string
  defaultCheckOut?: string
  defaultCheckIn?: string
}

type AvailState = {
  loading: boolean
  count: number | null
  error: string | null
}

export function DateStep({ categories, onNext, onChange, defaultCategoryId, defaultCheckIn, defaultCheckOut }: DateStepProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>(defaultCheckIn ? new Date(defaultCheckIn) : undefined)
  const [checkOut, setCheckOut] = useState<Date | undefined>(defaultCheckOut ? new Date(defaultCheckOut) : undefined)
  const [selections, setSelections] = useState<RoomSelection[]>([])
  const [fieldErrors, setFieldErrors] = useState<{ checkIn?: string; checkOut?: string; selections?: string }>({})
  const [avail, setAvail] = useState<Record<string, AvailState>>({})
  const initialized = useRef(false)
  const mounted = useRef(false)

  async function checkAvailability(categoryId: string, ci: string, co: string) {
    const key = `${categoryId}_${ci}_${co}`
    setAvail((prev) => ({ ...prev, [key]: { loading: true, count: null, error: null } }))
    const result = await getAvailableRooms(categoryId, ci, co)
    setAvail((prev) => ({
      ...prev,
      [key]: {
        loading: false,
        count: result.data?.length ?? 0,
        error: result.error || null,
      },
    }))
  }

  function syncUp(roomSelections: RoomSelection[], dates?: { checkIn?: string; checkOut?: string }) {
    onChange?.({
      checkIn: dates?.checkIn ?? (checkIn ? format(checkIn, "yyyy-MM-dd") : ""),
      checkOut: dates?.checkOut ?? (checkOut ? format(checkOut, "yyyy-MM-dd") : ""),
      roomSelections,
    })
  }

  function addSelection(categoryId: string) {
    if (!categoryId) return
    const cat = categories.find((c) => c.id === categoryId)
    if (!cat) return

    if (selections.some((s) => s.categoryId === categoryId)) return
    const next = [...selections, {
      categoryId: cat.id,
      categoryName: cat.name,
      basePrice: Number(cat.base_price_usd),
      maxOccupancy: cat.max_occupancy,
      quantity: 1,
      availableCount: 0,
      imageUrl: cat.image_url,
    }]
    setSelections(next)
    syncUp(next)

    if (checkIn && checkOut) {
      checkAvailability(categoryId, format(checkIn, "yyyy-MM-dd"), format(checkOut, "yyyy-MM-dd"))
    }
  }

  useEffect(() => {
    if (checkIn && checkOut) {
      if (defaultCategoryId && !initialized.current) {
        initialized.current = true
        addSelection(defaultCategoryId)
      } else {
        for (const sel of selections) {
          checkAvailability(sel.categoryId, format(checkIn, "yyyy-MM-dd"), format(checkOut, "yyyy-MM-dd"))
        }
      }
    } else {
      setSelections([])
      if (mounted.current) syncUp([])
    }
  }, [checkIn, checkOut])

  useEffect(() => {
    mounted.current = true
  }, [])

  function updateSelection(categoryId: string, updates: Partial<RoomSelection>) {
    const next = selections.map((s) => s.categoryId === categoryId ? { ...s, ...updates } : s)
    setSelections(next)
    syncUp(next)
  }

  function removeSelection(categoryId: string) {
    const next = selections.filter((s) => s.categoryId !== categoryId)
    setSelections(next)
    syncUp(next)
  }

  function handleSubmit() {
    if (!checkIn || !checkOut) {
      const errs: { checkIn?: string; checkOut?: string } = {}
      if (!checkIn) errs.checkIn = "Please select a check-in date"
      if (!checkOut) errs.checkOut = "Please select a check-out date"
      setFieldErrors(errs)
      return
    }

    const ci = format(checkIn, "yyyy-MM-dd")
    const co = format(checkOut, "yyyy-MM-dd")

    if (checkOut <= checkIn) {
      setFieldErrors({ checkOut: "Check-out date must be after check-in date" })
      return
    }

    if (selections.length === 0) {
      setFieldErrors({ selections: "Please select at least one room" })
      return
    }

    const result = dateStepSchema.safeParse({ checkIn: ci, checkOut: co, roomSelections: selections })
    if (!result.success) {
      const errs: { checkIn?: string; checkOut?: string; selections?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === "checkIn") errs.checkIn = issue.message
        if (issue.path[0] === "checkOut") errs.checkOut = issue.message
        if (issue.path[0] === "roomSelections") errs.selections = issue.message
      }
      setFieldErrors(errs)
      return
    }

    const errs: { checkIn?: string; checkOut?: string; selections?: string } = {}
    for (const sel of selections) {
      const key = `${sel.categoryId}_${ci}_${co}`
      const a = avail[key]
      if (a?.loading) {
        errs.selections = `Still checking availability for ${sel.categoryName}. Please wait a moment and try again.`
      } else if (a?.error) {
        errs.selections = `Unable to check availability for ${sel.categoryName}. Please try different dates.`
      } else if (a?.count !== null && a.count !== undefined && a.count < sel.quantity) {
        errs.selections = a.count === 0
          ? `Sorry, ${sel.categoryName} is not available for the selected dates. Please choose different dates or remove this room.`
          : `Only ${a.count} ${sel.categoryName} room${a.count > 1 ? "s" : ""} available for the selected dates. Please reduce the quantity to ${a.count} or less.`
      }
    }
    setFieldErrors(errs)
    if (errs.selections) return

    onNext({ checkIn: ci, checkOut: co, roomSelections: selections })
  }

  const selectedCategoryIds = new Set(selections.map((s) => s.categoryId))

  function getAvail(categoryId: string): AvailState | undefined {
    if (!checkIn || !checkOut) return undefined
    const key = `${categoryId}_${format(checkIn, "yyyy-MM-dd")}_${format(checkOut, "yyyy-MM-dd")}`
    return avail[key]
  }

  const nights = checkIn && checkOut ? Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Select Dates &amp; Rooms</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">Choose your dates and the rooms you need.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div data-invalid={!!fieldErrors.checkIn || undefined}>
          <label className="text-sm font-sans font-medium mb-1.5 block text-stone-900 dark:text-stone-100">Check-in *</label>
          <Popover>
            <PopoverTrigger className={cn(
              "flex h-10 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
              !checkIn && "text-stone-400 dark:text-stone-500",
              fieldErrors.checkIn && "border-red-500"
            )}>
              <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
              {checkIn ? format(checkIn, "PPP") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(d) => { setCheckIn(d); setFieldErrors((p) => ({ ...p, checkIn: undefined })); syncUp(selections, { checkIn: d ? format(d, "yyyy-MM-dd") : "" }) }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
          {fieldErrors.checkIn && (
            <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.checkIn}</p>
          )}
        </div>

        <div data-invalid={!!fieldErrors.checkOut || undefined}>
          <label className="text-sm font-sans font-medium mb-1.5 block text-stone-900 dark:text-stone-100">Check-out *</label>
          <Popover>
            <PopoverTrigger className={cn(
              "flex h-10 w-full items-center justify-start border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 text-sm font-sans outline-none transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
              !checkOut && "text-stone-400 dark:text-stone-500",
              fieldErrors.checkOut && "border-red-500"
            )}>
              <CalendarIcon className="mr-2 size-4 shrink-0 text-stone-400 dark:text-stone-500" />
              {checkOut ? format(checkOut, "PPP") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={(d) => { setCheckOut(d); setFieldErrors((p) => ({ ...p, checkOut: undefined })); syncUp(selections, { checkOut: d ? format(d, "yyyy-MM-dd") : "" }) }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (checkIn ? date <= checkIn : false)}
              />
            </PopoverContent>
          </Popover>
          {fieldErrors.checkOut && (
            <p className="mt-1 text-sm text-red-500 font-sans" role="alert">{fieldErrors.checkOut}</p>
          )}
        </div>
      </div>

      {checkIn && checkOut && (
        <div className="space-y-4" data-invalid={!!fieldErrors.selections || undefined}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Room Categories</label>
            <span className="text-xs font-sans text-stone-400 dark:text-stone-500">
              {selections.length} of {categories.length} selected
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const isSelected = selectedCategoryIds.has(cat.id)
              const sel = selections.find((s) => s.categoryId === cat.id)
              const a = getAvail(cat.id)
              const points = cat.description
                ? cat.description.split("\n").filter(Boolean)
                : []
              const slug = cat.name.toLowerCase()

              return (
                <div
                  key={cat.id}
                  className={cn(
                    "border transition-all bg-white dark:bg-stone-900",
                    isSelected
                      ? "border-stone-900 dark:border-stone-100"
                      : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600"
                  )}
                >
                  <div className="relative aspect-[3/2] bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BedDouble className="size-10 text-stone-300 dark:text-stone-600" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/90 dark:bg-stone-900/90 text-stone-900 dark:text-stone-100 text-xs font-sans font-medium px-2 py-1">
                        Up to {cat.max_occupancy} {cat.max_occupancy === 1 ? "guest" : "guests"}
                      </span>
                    </div>
                  </div>

                  {!isSelected ? (
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-sans font-medium text-stone-900 dark:text-stone-100">{cat.name}</h3>
<span className="text-xl font-sans font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap tabular-nums">
  {formatCurrency(Number(cat.base_price_usd))}
  <span className="text-xs text-stone-500 dark:text-stone-400 font-normal">/night</span>
</span>
                      </div>

                      {points.length > 0 && (
                        <ul className="space-y-1.5">
                          {points.slice(0, 4).map((pt, i) => (
                            <li key={i} className="text-xs font-sans text-stone-500 dark:text-stone-400 flex items-start gap-2 leading-relaxed">
                              <span className="mt-[5px] block size-1 bg-stone-400 dark:bg-stone-500 shrink-0" />
                              {pt}
                            </li>
                          ))}
                          {points.length > 4 && (
                            <li className="text-xs font-sans text-stone-400 dark:text-stone-500">+{points.length - 4} more features</li>
                          )}
                        </ul>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => addSelection(cat.id)}
                          className="flex-1 gap-1.5 py-2 text-sm font-sans font-medium border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center"
                        >
                          <Plus className="size-3.5" />
                          Add room
                        </button>
                        <Link href={`/rooms/${slug}`} className="shrink-0">
                          <span className="py-2 px-3 text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-1">
                            <ExternalLink className="size-3" />
                            Details
                          </span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200 dark:divide-stone-800">
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-sans font-medium text-stone-900 dark:text-stone-100">{sel!.categoryName}</h3>
                              <span className="text-xs font-sans text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                <Check className="size-3" />
                                Added
                              </span>
                            </div>
<p className="text-lg font-sans font-semibold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
  {formatCurrency(Number(sel!.basePrice))}
  <span className="text-xs text-stone-500 dark:text-stone-400 font-normal">/ night</span>
</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {a?.loading && <span className="text-xs font-sans text-stone-500 dark:text-stone-400 animate-pulse">Checking...</span>}
                            {(() => {
                              if (!a || a.loading || a.count === null) return null
  const datesValid = checkIn !== undefined && checkOut !== undefined && checkOut > checkIn
  const isAnyAvailabilityLoading = selections.some((sel) => {
    if (!checkIn || !checkOut) return false
    const key = `${sel.categoryId}_${format(checkIn, "yyyy-MM-dd")}_${format(checkOut, "yyyy-MM-dd")}`
    return avail[key]?.loading
  })

  return (
                                <span className={cn(
                                  "text-xs font-sans px-2 py-0.5 font-medium",
                                  a.count > 0 ? "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                                )}>
                                  {a.count > 0 ? `${a.count} available` : "Sold out"}
                                </span>
                              )
                            })()}
                            {a?.error && <span className="text-xs text-red-500 font-sans">{a.error}</span>}
                            <button
                              type="button"
                              onClick={() => removeSelection(cat.id)}
                              className="text-stone-500 dark:text-stone-400 hover:text-red-500 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {points.length > 0 && (
                          <details className="group text-sm font-sans">
                            <summary className="cursor-pointer text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors list-none flex items-center gap-1.5">
                              <span className="text-xs transition-transform group-open:rotate-90">&rsaquo;</span>
                              Room features
                            </summary>
                            <ul className="mt-3 space-y-1.5 pl-4">
                              {points.map((pt, i) => (
                                <li key={i} className="text-xs font-sans text-stone-500 dark:text-stone-400 flex items-start gap-2 leading-relaxed">
                                  <span className="mt-[5px] block size-1 bg-stone-400 dark:bg-stone-500 shrink-0" />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>

                      <div className="p-5 space-y-4">
                        <div>
                          <label className="text-xs font-sans font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">
                            Number of rooms
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateSelection(cat.id, { quantity: Math.max(1, sel!.quantity - 1) })}
                              className="flex size-8 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                              disabled={sel!.quantity <= 1}
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-8 text-center text-base font-sans font-medium text-stone-900 dark:text-stone-100 tabular-nums">{sel!.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateSelection(cat.id, { quantity: Math.min(a?.count ?? 99, sel!.quantity + 1) })}
                              className="flex size-8 items-center justify-center border border-stone-200 dark:border-stone-800 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                              disabled={a !== undefined && a.count !== null && sel!.quantity >= a.count}
                            >
                              <Plus className="size-3.5" />
                            </button>
                            <span className="text-xs font-sans text-stone-500 dark:text-stone-400 ml-1">
                              {sel!.quantity === 1 ? "1 room" : `${sel!.quantity} rooms`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-stone-50 dark:bg-stone-800 flex items-center justify-between">
                        <div className="text-sm font-sans">
                          <span className="text-stone-500 dark:text-stone-400">Room subtotal</span>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                            {formatCurrency(Number(sel!.basePrice))} &times; {sel!.quantity} {sel!.quantity === 1 ? "room" : "rooms"} &times; {nights} {nights === 1 ? "night" : "nights"}
                          </p>
                        </div>
<span className="text-xl font-sans font-bold text-stone-900 dark:text-stone-100 tabular-nums">
  {formatCurrency(Number(sel!.basePrice) * sel!.quantity * nights)}
</span>
                      </div>

                      <div className="p-3">
                        <Link href={`/rooms/${slug}`}>
                          <span className="flex w-full py-2 text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors items-center justify-center gap-1.5">
                            <ExternalLink className="size-3" />
                            View full room details
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selections.length === 0 && categories.length === 0 && (
            <div className="text-sm font-sans text-stone-500 dark:text-stone-400 py-8 text-center border border-dashed border-stone-200 dark:border-stone-800">
              No room categories available
            </div>
          )}

          {fieldErrors.selections && (
            <p className="text-sm text-red-500 font-sans" role="alert">{fieldErrors.selections}</p>
          )}
        </div>
      )}

      {nights > 0 && selections.length > 0 && (
<div className="bg-stone-50 dark:bg-stone-900 p-3 flex items-center justify-between text-sm font-sans">
  <span className="text-stone-500 dark:text-stone-400 text-base">
    {selections.reduce((s, sel) => s + sel.quantity, 0)} room{selections.reduce((s, sel) => s + sel.quantity, 0) > 1 ? "s" : ""} &times; {nights} {nights === 1 ? "night" : "nights"}
  </span>
  <span className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
    {formatCurrency(selections.reduce((sum, sel) => sum + Number(sel.basePrice) * sel.quantity * nights, 0))}
  </span>
</div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
        disabled={selections.length === 0}
      >
        Next: Add Extras
      </button>
    </div>
  )
}
