"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn, rentalDays } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { dashboardBookingSchema } from "@/lib/validations"
import { BOARD_PLANS, BOARD_PRICE_PER_NIGHT, EQUIPMENT_SURFBOARD, EQUIPMENT_BICYCLE, type BoardPlan } from "@/lib/constants"

type Category = { id: string; name: string; base_price_usd: number }
type Room = { id: string; room_number: string; category_id: string; operational_status: string }

function QtyStepper({ value, onChange, max = 20 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
        −
      </Button>
      <span className="w-6 text-center text-sm font-medium">{value}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        +
      </Button>
    </div>
  )
}

export function BookingForm({ categories, rooms }: { categories: Category[]; rooms: Room[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>("walk_in")
  const [otaName, setOtaName] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [boardPlan, setBoardPlan] = useState<BoardPlan>("room_only")
  const [surfboardQty, setSurfboardQty] = useState(0)
  const [surfboardStart, setSurfboardStart] = useState("")
  const [surfboardEnd, setSurfboardEnd] = useState("")
  const [bicycleQty, setBicycleQty] = useState(0)
  const [bicycleStart, setBicycleStart] = useState("")
  const [bicycleEnd, setBicycleEnd] = useState("")
  const [prices, setPrices] = useState({ surfboard: 0, bicycle: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [availableRoomIds, setAvailableRoomIds] = useState<Set<string> | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  useEffect(() => {
    const loadPricing = async () => {
      const client = (await import("@/lib/supabase/client")).createClient()
      const [surf, bike] = await Promise.all([
        client.from("equipment_categories").select("price_per_day_usd").eq("id", EQUIPMENT_SURFBOARD).single(),
        client.from("equipment_categories").select("price_per_day_usd").eq("id", EQUIPMENT_BICYCLE).single(),
      ])
      setPrices({
        surfboard: Number(surf.data?.price_per_day_usd ?? 0),
        bicycle: Number(bike.data?.price_per_day_usd ?? 0),
      })
    }
    loadPricing()
  }, [])

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setAvailableRoomIds(null)
      return
    }
    let ignore = false
    const fetchAvailable = async () => {
      setLoadingAvailability(true)
      try {
        const client = (await import("@/lib/supabase/client")).createClient()
        const { data: booked } = await client
          .from("bookings")
          .select("room_id")
          .in("status", ["confirmed", "checked_in", "pending_payment"])
          .lt("check_in", format(checkOut, "yyyy-MM-dd"))
          .gt("check_out", format(checkIn, "yyyy-MM-dd"))
        if (!ignore) {
          const bookedSet = new Set((booked ?? []).map((b: any) => b.room_id))
          setAvailableRoomIds(bookedSet)
        }
      } finally {
        if (!ignore) setLoadingAvailability(false)
      }
    }
    fetchAvailable()
    return () => { ignore = true }
  }, [checkIn, checkOut])

  const filteredRooms = rooms.filter((r) => {
    if (categoryId && r.category_id !== categoryId) return false
    if (availableRoomIds && availableRoomIds.has(r.id)) return false
    return true
  })

  function validate(): boolean {
    const result = dashboardBookingSchema.safeParse({
      checkIn, checkOut, roomId, source, otaName,
      guestName, guestEmail, guestPhone, notes,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] && !errs[String(issue.path[0])]) {
          errs[String(issue.path[0])] = issue.message
        }
      }
      setFieldErrors(errs)
      return false
    }
    if (surfboardQty > 0 && (!surfboardStart || !surfboardEnd)) {
      setFieldErrors((p) => ({ ...p, surfboardEnd: "Rental dates are required" }))
      return false
    }
    if (surfboardQty > 0 && surfboardEnd <= surfboardStart) {
      setFieldErrors((p) => ({ ...p, surfboardEnd: "End date must be after start date" }))
      return false
    }
    if (bicycleQty > 0 && (!bicycleStart || !bicycleEnd)) {
      setFieldErrors((p) => ({ ...p, bicycleEnd: "Rental dates are required" }))
      return false
    }
    if (bicycleQty > 0 && bicycleEnd <= bicycleStart) {
      setFieldErrors((p) => ({ ...p, bicycleEnd: "End date must be after start date" }))
      return false
    }
    return true
  }

  async function insertEquipment(categoryId: string, qty: number, start: string, end: string, perDay: number, guestId: string, bookingId: string) {
    const { data: units, error } = await supabase.rpc("get_available_equipment_units", {
      p_category_id: categoryId,
      p_start_date: start,
      p_end_date: end,
    })
    if (error) throw new Error(error.message)
    const available = units ?? []
    if (available.length < qty) {
      throw new Error(`Only ${available.length} unit(s) available for these dates — reduce the quantity or change the dates`)
    }
    const days = rentalDays(start, end, Math.max(1, Math.round(
      (checkOut!.getTime() - checkIn!.getTime()) / (1000 * 60 * 60 * 24)
    )))
    const price = perDay * days
    const { error: insertErr } = await supabase.from("equipment_bookings").insert(
      available.slice(0, qty).map((u: { id: string }) => ({
        unit_id: u.id,
        guest_id: guestId,
        booking_id: bookingId,
        start_date: start,
        end_date: end,
        price_usd: price,
        status: "active" as const,
      }))
    )
    if (insertErr) throw new Error(insertErr.message)
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)

    try {
      const guestResult = await supabase
        .from("guests")
        .insert({
          full_name: guestName.trim(),
          email: guestEmail.trim() || null,
          phone: guestPhone.trim() || null,
        })
        .select("id")
        .single()

      if (guestResult.error) throw new Error(guestResult.error.message)
      const guestId = guestResult.data.id

      const { data: user } = await supabase.auth.getUser()

      const nights = Math.max(1, Math.round(
        (checkOut!.getTime() - checkIn!.getTime()) / (1000 * 60 * 60 * 24)
      ))

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          guest_id: guestId,
          room_id: roomId!,
          check_in: format(checkIn!, "yyyy-MM-dd"),
          check_out: format(checkOut!, "yyyy-MM-dd"),
          status: "confirmed",
          source: source as "walk_in" | "ota_manual",
          ota_name: source === "ota_manual" ? otaName.trim() : null,
          notes: notes.trim() || null,
          created_by_staff_id: user.user?.id ?? null,
          num_guests: 1,
          board_plan: boardPlan,
          board_total_usd: BOARD_PRICE_PER_NIGHT(boardPlan) * nights,
        })
        .select("id")
        .single()

      if (bookingError) throw new Error(bookingError.message)

      if (surfboardQty > 0) {
        await insertEquipment(EQUIPMENT_SURFBOARD, surfboardQty, surfboardStart, surfboardEnd, prices.surfboard, guestId, booking.id)
      }
      if (bicycleQty > 0) {
        await insertEquipment(EQUIPMENT_BICYCLE, bicycleQty, bicycleStart, bicycleEnd, prices.bicycle, guestId, booking.id)
      }

      toast.success("Booking created")
      router.push("/dashboard/bookings/" + booking.id)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2" data-invalid={!!fieldErrors.checkIn || undefined}>
            <Label>Check-in *</Label>
            <Popover>
              <PopoverTrigger className={cn(
                "flex h-9 w-full items-center justify-start rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[box-shadow,border-color] hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                !checkIn && "text-muted-foreground",
                fieldErrors.checkIn && "border-destructive"
              )}>
                <CalendarIcon className="mr-2 size-4 shrink-0" />
                {checkIn ? format(checkIn, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={checkIn} onSelect={(d) => { setCheckIn(d); setFieldErrors((p) => ({ ...p, checkIn: "" })) }} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} />
              </PopoverContent>
            </Popover>
            {fieldErrors.checkIn && <p className="text-sm text-destructive" role="alert">{fieldErrors.checkIn}</p>}
          </div>
          <div className="space-y-2" data-invalid={!!fieldErrors.checkOut || undefined}>
            <Label>Check-out *</Label>
            <Popover>
              <PopoverTrigger className={cn(
                "flex h-9 w-full items-center justify-start rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[box-shadow,border-color] hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                !checkOut && "text-muted-foreground",
                fieldErrors.checkOut && "border-destructive"
              )}>
                <CalendarIcon className="mr-2 size-4 shrink-0" />
                {checkOut ? format(checkOut, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={checkOut} onSelect={(d) => { setCheckOut(d); setFieldErrors((p) => ({ ...p, checkOut: "" })) }} disabled={(d) => !checkIn || d <= checkIn} />
              </PopoverContent>
            </Popover>
            {fieldErrors.checkOut && <p className="text-sm text-destructive" role="alert">{fieldErrors.checkOut}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Room Category</Label>
          <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setRoomId(null) }}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2" data-invalid={!!fieldErrors.roomId || undefined}>
          <Label>Room * {checkIn && checkOut && checkOut > checkIn ? (loadingAvailability ? <span className="text-muted-foreground font-normal">loading availability...</span> : <span className="text-muted-foreground font-normal">({filteredRooms.length} available)</span>) : null}</Label>
          <Select value={roomId} onValueChange={(val) => { setRoomId(val); setFieldErrors((p) => ({ ...p, roomId: "" })) }}>
            <SelectTrigger data-invalid={!!fieldErrors.roomId || undefined}>
              <SelectValue placeholder={loadingAvailability ? "Checking availability..." : "Select a room"} />
            </SelectTrigger>
            <SelectContent>
              {filteredRooms.length === 0 ? (
                <SelectItem value="_none" disabled>No rooms available for selected dates</SelectItem>
              ) : (
                filteredRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {fieldErrors.roomId && <p className="text-sm text-destructive" role="alert">{fieldErrors.roomId}</p>}
        </div>

        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={source} onValueChange={(val) => setSource(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="ota_manual">OTA (Manual)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {source === "ota_manual" && (
          <div className="space-y-2" data-invalid={!!fieldErrors.otaName || undefined}>
            <Label>OTA Name *</Label>
            <Input value={otaName} onChange={(e) => { setOtaName(e.target.value); setFieldErrors((p) => ({ ...p, otaName: "" })) }} placeholder="e.g. Booking.com" aria-invalid={!!fieldErrors.otaName} />
            {fieldErrors.otaName && <p className="text-sm text-destructive" role="alert">{fieldErrors.otaName}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Board Plan</Label>
          <div className="grid grid-cols-3 gap-2">
            {BOARD_PLANS.map((plan) => (
              <button
                key={plan.key}
                type="button"
                onClick={() => setBoardPlan(plan.key)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  boardPlan === plan.key
                    ? "border-primary bg-primary/10"
                    : "border-input hover:bg-muted"
                )}
              >
                <span className="block font-medium">{plan.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {plan.pricePerNight > 0 ? `+$${plan.pricePerNight} / night` : "Included"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Equipment Rental</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-input p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Surfboard</p>
                  <p className="text-xs text-muted-foreground">{prices.surfboard > 0 ? `$${prices.surfboard}/day` : "Loading..."}</p>
                </div>
                <QtyStepper value={surfboardQty} onChange={setSurfboardQty} />
              </div>
              {surfboardQty > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start *</Label>
                    <Input type="date" value={surfboardStart} onChange={(e) => setSurfboardStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End *</Label>
                    <Input type="date" value={surfboardEnd} onChange={(e) => setSurfboardEnd(e.target.value)} aria-invalid={!!fieldErrors.surfboardEnd} />
                  </div>
                </div>
              )}
              {fieldErrors.surfboardEnd && <p className="text-sm text-destructive" role="alert">{fieldErrors.surfboardEnd}</p>}
            </div>

            <div className="rounded-lg border border-input p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Bicycle</p>
                  <p className="text-xs text-muted-foreground">{prices.bicycle > 0 ? `$${prices.bicycle}/day` : "Loading..."}</p>
                </div>
                <QtyStepper value={bicycleQty} onChange={setBicycleQty} />
              </div>
              {bicycleQty > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start *</Label>
                    <Input type="date" value={bicycleStart} onChange={(e) => setBicycleStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End *</Label>
                    <Input type="date" value={bicycleEnd} onChange={(e) => setBicycleEnd(e.target.value)} aria-invalid={!!fieldErrors.bicycleEnd} />
                  </div>
                </div>
              )}
              {fieldErrors.bicycleEnd && <p className="text-sm text-destructive" role="alert">{fieldErrors.bicycleEnd}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Guest</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2" data-invalid={!!fieldErrors.guestName || undefined}>
              <Label>Full Name *</Label>
              <Input value={guestName} onChange={(e) => { setGuestName(e.target.value); setFieldErrors((p) => ({ ...p, guestName: "" })) }} placeholder="Guest name" aria-invalid={!!fieldErrors.guestName} />
              {fieldErrors.guestName && <p className="text-sm text-destructive" role="alert">{fieldErrors.guestName}</p>}
            </div>
            <div className="space-y-2" data-invalid={!!fieldErrors.guestEmail || undefined}>
              <Label>Email</Label>
              <Input type="email" value={guestEmail} onChange={(e) => { setGuestEmail(e.target.value); setFieldErrors((p) => ({ ...p, guestEmail: "" })) }} placeholder="guest@example.com" aria-invalid={!!fieldErrors.guestEmail} />
              {fieldErrors.guestEmail && <p className="text-sm text-destructive" role="alert">{fieldErrors.guestEmail}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2" data-invalid={!!fieldErrors.guestPhone || undefined}>
              <Label>Phone</Label>
              <Input value={guestPhone} onChange={(e) => { setGuestPhone(e.target.value); setFieldErrors((p) => ({ ...p, guestPhone: "" })) }} placeholder="+94 XXX XXX XXX" aria-invalid={!!fieldErrors.guestPhone} />
              {fieldErrors.guestPhone && <p className="text-sm text-destructive" role="alert">{fieldErrors.guestPhone}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or notes..." rows={3} />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create Booking"}
        </Button>
      </CardContent>
    </Card>
  )
}