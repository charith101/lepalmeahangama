"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Trash2Icon, PlusIcon, XIcon } from "lucide-react"
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
import { getGuest } from "@/lib/actions/guests"
import { BOARD_PLANS, BOARD_PRICE_PER_NIGHT, EQUIPMENT_SURFBOARD, EQUIPMENT_BICYCLE, MOTORBIKE_CATEGORIES, CAR_CATEGORIES, surfboardTotalForDays, SURFBOARD_TIERS, type BoardPlan } from "@/lib/constants"

type Category = { id: string; name: string; base_price_usd: number }
type Room = { id: string; room_number: string; category_id: string; operational_status: string }

const MOTORBIKE_OPTIONS: Array<{ id: string; name: string }> = [
  { id: MOTORBIKE_CATEGORIES.tvs_ntorq, name: "TVS Ntorq 135CC" },
  { id: MOTORBIKE_CATEGORIES.honda_dio, name: "Honda Dio 110CC" },
  { id: MOTORBIKE_CATEGORIES.honda_navi, name: "Honda Navi 109cc" },
]

const CAR_OPTIONS: Array<{ id: string; name: string }> = [
  { id: CAR_CATEGORIES.wagonR, name: "Suzuki WagonR" },
  { id: CAR_CATEGORIES.hustler, name: "SUZUKI HUSTLER" },
  { id: CAR_CATEGORIES.aqua, name: "TOYOTA AQUA" },
  { id: CAR_CATEGORIES.fit_gp5, name: "HONDA FIT GP5" },
  { id: CAR_CATEGORIES.prius, name: "TOYOTA PRIUS 3RD GEN" },
  { id: CAR_CATEGORIES.vezel, name: "Honda Vezel" },
  { id: CAR_CATEGORIES.fit_shuttle, name: "Honda Fit Shuttle" },
  { id: CAR_CATEGORIES.every, name: "Suzuki Every" },
]

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

type SelectedGuest = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  nic_or_passport: string | null
}

export function BookingForm({ categories, rooms }: { categories: Category[]; rooms: Room[] }) {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  type RoomSelection = { roomId: string; roomNumber: string; categoryName: string; basePrice: number }
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([])
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null)
  const [addRoomId, setAddRoomId] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(searchParams.get("source") === "ota_manual" ? "ota_manual" : "walk_in")
  const [guestId, setGuestId] = useState<string | null>(searchParams.get("guestId"))
  const [selectedGuest, setSelectedGuest] = useState<SelectedGuest | null>(null)
  const [loadingGuest, setLoadingGuest] = useState(false)
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
  const [motorbikeModel, setMotorbikeModel] = useState<string | null>(null)
  const [motorbikeQty, setMotorbikeQty] = useState(1)
  const [motorbikeStart, setMotorbikeStart] = useState("")
  const [motorbikeEnd, setMotorbikeEnd] = useState("")
  const [carModel, setCarModel] = useState<string | null>(null)
  const [carQty, setCarQty] = useState(1)
  const [carStart, setCarStart] = useState("")
  const [carEnd, setCarEnd] = useState("")
  const [numGuests, setNumGuests] = useState(1)
  const [guestNationality, setGuestNationality] = useState("")
  const [guestNicPassport, setGuestNicPassport] = useState("")
  const [prices, setPrices] = useState<Record<string, number>>({
    ...Object.fromEntries(Object.values(MOTORBIKE_CATEGORIES).map((id) => [id, 0])),
    ...Object.fromEntries(Object.values(CAR_CATEGORIES).map((id) => [id, 0])),
  })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [availableRoomIds, setAvailableRoomIds] = useState<Set<string> | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  useEffect(() => {
    const loadPricing = async () => {
      const client = (await import("@/lib/supabase/client")).createClient()
      const allIds = [
        EQUIPMENT_SURFBOARD, EQUIPMENT_BICYCLE,
        ...Object.values(MOTORBIKE_CATEGORIES),
        ...Object.values(CAR_CATEGORIES),
      ]
      const { data } = await client.from("equipment_categories").select("id, price_per_day_usd").in("id", allIds)
      const patch: Record<string, number> = {}
      for (const row of data ?? []) {
        patch[row.id] = Number(row.price_per_day_usd ?? 0)
      }
      setPrices((prev) => ({ ...prev, ...patch }))
    }
    loadPricing()
  }, [])

  useEffect(() => {
    if (!guestId) return
    let ignore = false
    const load = async () => {
      setLoadingGuest(true)
      try {
        const res = await getGuest(guestId)
        if (ignore) return
        if ("error" in res) {
          toast.error(res.error || "Guest not found")
          setGuestId(null)
        } else {
          setSelectedGuest(res.data)
        }
      } finally {
        if (!ignore) setLoadingGuest(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [guestId])

  function clearSelectedGuest() {
    setGuestId(null)
    setSelectedGuest(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("guestId")
    const qs = params.toString()
    router.replace(`/dashboard/bookings/new${qs ? `?${qs}` : ""}`)
  }

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return
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
          const bookedSet = new Set((booked ?? []).map((b: { room_id: string }) => b.room_id))
          setAvailableRoomIds(bookedSet)
        }
      } finally {
        if (!ignore) setLoadingAvailability(false)
      }
    }
    fetchAvailable()
    return () => { ignore = true }
  }, [checkIn, checkOut])

  const selectedRoomIds = new Set(roomSelections.map((s) => s.roomId))
  const filteredRooms = rooms.filter((r) => {
    if (addCategoryId && r.category_id !== addCategoryId) return false
    if (availableRoomIds && availableRoomIds.has(r.id)) return false
    if (selectedRoomIds.has(r.id)) return false
    return true
  })

  function addRoom() {
    if (!addRoomId) return
    const room = rooms.find((r) => r.id === addRoomId)
    if (!room) return
    const cat = categories.find((c) => c.id === room.category_id)
    setRoomSelections((prev) => [...prev, { roomId: room.id, roomNumber: room.room_number, categoryName: cat?.name ?? "Room", basePrice: Number(cat?.base_price_usd ?? 0) }])
    setAddRoomId(null)
  }

  function removeRoom(roomId: string) {
    setRoomSelections((prev) => prev.filter((s) => s.roomId !== roomId))
  }

  function validate(): boolean {
    if (roomSelections.length === 0) {
      setFieldErrors({ roomId: "Please add at least one room" })
      return false
    }
    const result = dashboardBookingSchema.safeParse({
      checkIn, checkOut, roomId: roomSelections[0].roomId, source, otaName,
      guestName: selectedGuest?.full_name ?? guestName,
      guestEmail: selectedGuest?.email ?? guestEmail,
      guestPhone: selectedGuest?.phone ?? guestPhone,
      guestNationality: selectedGuest?.nationality ?? guestNationality,
      guestNicPassport: selectedGuest?.nic_or_passport ?? guestNicPassport,
      notes, numGuests,
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
    if (motorbikeModel && (!motorbikeStart || !motorbikeEnd)) {
      setFieldErrors((p) => ({ ...p, motorbikeEnd: "Rental dates are required" }))
      return false
    }
    if (motorbikeModel && motorbikeEnd <= motorbikeStart) {
      setFieldErrors((p) => ({ ...p, motorbikeEnd: "End date must be after start date" }))
      return false
    }
    if (carModel && (!carStart || !carEnd)) {
      setFieldErrors((p) => ({ ...p, carEnd: "Rental dates are required" }))
      return false
    }
    if (carModel && carEnd <= carStart) {
      setFieldErrors((p) => ({ ...p, carEnd: "End date must be after start date" }))
      return false
    }
    return true
  }

  async function insertEquipment(categoryId: string, qty: number, start: string, end: string, perDay: number, guestId: string, bookingId: string, totalPrice?: number) {
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
    const price = totalPrice ?? perDay * days
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
    if (loadingGuest || !validate()) return
    setSubmitting(true)

    try {
      let guestIdOut: string
      if (selectedGuest) {
        guestIdOut = selectedGuest.id
      } else {
        const guestResult = await supabase
          .from("guests")
          .insert({
            full_name: guestName.trim(),
            email: guestEmail.trim() || null,
            phone: guestPhone.trim() || null,
            nationality: guestNationality.trim() || null,
            nic_or_passport: guestNicPassport.trim() || null,
          })
          .select("id")
          .single()

        if (guestResult.error) throw new Error(guestResult.error.message)
        guestIdOut = guestResult.data.id
      }

      const { data: user } = await supabase.auth.getUser()

      const nights = Math.max(1, Math.round(
        (checkOut!.getTime() - checkIn!.getTime()) / (1000 * 60 * 60 * 24)
      ))

      const groupBookingId = crypto.randomUUID()
      const bookingIds: string[] = []

      for (const sel of roomSelections) {
        const { data: conflicts } = await supabase
          .from("bookings")
          .select("id")
          .eq("room_id", sel.roomId)
          .in("status", ["pending_payment", "confirmed", "checked_in"])
          .lt("check_in", format(checkOut!, "yyyy-MM-dd"))
          .gt("check_out", format(checkIn!, "yyyy-MM-dd"))
          .limit(1)

        if (conflicts && conflicts.length > 0) {
          throw new Error(`Room ${sel.roomNumber} was just booked by someone else. Please go back and choose a different room or dates.`)
        }

        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            guest_id: guestIdOut,
            room_id: sel.roomId,
            check_in: format(checkIn!, "yyyy-MM-dd"),
            check_out: format(checkOut!, "yyyy-MM-dd"),
            status: "confirmed",
            source: source as "walk_in" | "ota_manual",
            ota_name: source === "ota_manual" ? otaName.trim() : null,
            notes: notes.trim() || null,
            created_by_staff_id: user.user?.id ?? null,
            num_guests: numGuests,
            board_plan: boardPlan,
            board_total_usd: BOARD_PRICE_PER_NIGHT(boardPlan) * nights,
            room_total_usd: sel.basePrice * nights,
            group_booking_id: groupBookingId,
          })
          .select("id")
          .single()

        if (bookingError) {
          if (bookingError.code === "23P01") {
            throw new Error(`Room ${sel.roomNumber} was just booked by someone else. Please go back and choose a different room or dates.`)
          }
          throw new Error(bookingError.message)
        }
        bookingIds.push(booking.id)
      }

      if (surfboardQty > 0) {
        const surfboardDays = rentalDays(surfboardStart, surfboardEnd, Math.max(1, Math.round(
          (checkOut!.getTime() - checkIn!.getTime()) / (1000 * 60 * 60 * 24)
        )))
        const surfboardTotal = surfboardTotalForDays(surfboardDays, prices[EQUIPMENT_SURFBOARD], SURFBOARD_TIERS) * surfboardQty
        await insertEquipment(EQUIPMENT_SURFBOARD, surfboardQty, surfboardStart, surfboardEnd, prices[EQUIPMENT_SURFBOARD], guestIdOut, bookingIds[0], surfboardTotal)
      }
      if (bicycleQty > 0) {
        await insertEquipment(EQUIPMENT_BICYCLE, bicycleQty, bicycleStart, bicycleEnd, prices[EQUIPMENT_BICYCLE], guestIdOut, bookingIds[0])
      }
      if (motorbikeModel) {
        await insertEquipment(motorbikeModel, motorbikeQty, motorbikeStart, motorbikeEnd, prices[motorbikeModel], guestIdOut, bookingIds[0])
      }
      if (carModel) {
        await insertEquipment(carModel, carQty, carStart, carEnd, prices[carModel], guestIdOut, bookingIds[0])
      }

      toast.success(`Booking created${roomSelections.length > 1 ? ` (${roomSelections.length} rooms)` : ""}`)
      router.push("/dashboard/bookings/" + bookingIds[0])
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

        <div className="space-y-2" data-invalid={!!fieldErrors.roomId || undefined}>
          <Label>Rooms *</Label>
          {roomSelections.length > 0 && (
            <div className="space-y-2">
              {roomSelections.map((sel) => (
                <div key={sel.roomId} className="flex items-center justify-between rounded-lg border border-input px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{sel.roomNumber}</span>
                    <span className="text-xs text-muted-foreground ml-2">{sel.categoryName}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRoom(sel.roomId)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Select value={addCategoryId} onValueChange={(val) => { setAddCategoryId(val); setAddRoomId(null) }} items={categories.map((c) => ({ value: c.id, label: c.name }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={addRoomId} onValueChange={setAddRoomId} disabled={!addCategoryId} items={filteredRooms.map((r) => ({ value: r.id, label: r.room_number }))}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAvailability ? "Checking..." : filteredRooms.length === 0 ? "No rooms" : "Select room"} />
              </SelectTrigger>
              <SelectContent>
                {filteredRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={addRoom} disabled={!addRoomId}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
          {fieldErrors.roomId && <p className="text-sm text-destructive" role="alert">{fieldErrors.roomId}</p>}
        </div>

        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={source} onValueChange={(val) => setSource(val)} items={[{ value: "walk_in", label: "Walk-in" }, { value: "ota_manual", label: "OTA (Manual)" }]}>
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
                  <p className="text-xs text-muted-foreground">{prices[EQUIPMENT_SURFBOARD] > 0 ? `$${prices[EQUIPMENT_SURFBOARD]}/day` : "Loading..."}</p>
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
                  <p className="text-xs text-muted-foreground">{prices[EQUIPMENT_BICYCLE] > 0 ? `$${prices[EQUIPMENT_BICYCLE]}/day` : "Loading..."}</p>
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

            <div className="rounded-lg border border-input p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Motorbike</p>
                  <p className="text-xs text-muted-foreground">
                    {motorbikeModel && prices[motorbikeModel] > 0 ? `$${prices[motorbikeModel]}/day` : "Select a model"}
                  </p>
                </div>
                <QtyStepper value={motorbikeQty} onChange={setMotorbikeQty} max={10} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model *</Label>
                <Select value={motorbikeModel} onValueChange={(val) => { setMotorbikeModel(val); setFieldErrors((p) => ({ ...p, motorbikeEnd: "" })) }} items={MOTORBIKE_OPTIONS.map((m) => ({ value: m.id, label: `${m.name} — ${prices[m.id] > 0 ? `$${prices[m.id]}` : "..."}/day` }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTORBIKE_OPTIONS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} — {prices[m.id] > 0 ? `$${prices[m.id]}` : "..."}/day</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {motorbikeModel && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start *</Label>
                    <Input type="date" value={motorbikeStart} onChange={(e) => setMotorbikeStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End *</Label>
                    <Input type="date" value={motorbikeEnd} onChange={(e) => setMotorbikeEnd(e.target.value)} aria-invalid={!!fieldErrors.motorbikeEnd} />
                  </div>
                </div>
              )}
              {fieldErrors.motorbikeEnd && <p className="text-sm text-destructive" role="alert">{fieldErrors.motorbikeEnd}</p>}
            </div>

            <div className="rounded-lg border border-input p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Car</p>
                  <p className="text-xs text-muted-foreground">
                    {carModel && prices[carModel] > 0 ? `$${prices[carModel]}/day` : "Select a model"}
                  </p>
                </div>
                <QtyStepper value={carQty} onChange={setCarQty} max={10} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model *</Label>
                <Select value={carModel} onValueChange={(val) => { setCarModel(val); setFieldErrors((p) => ({ ...p, carEnd: "" })) }} items={CAR_OPTIONS.map((c) => ({ value: c.id, label: `${c.name} — ${prices[c.id] > 0 ? `$${prices[c.id]}` : "..."}/day` }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAR_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {prices[c.id] > 0 ? `$${prices[c.id]}` : "..."}/day</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {carModel && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start *</Label>
                    <Input type="date" value={carStart} onChange={(e) => setCarStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End *</Label>
                    <Input type="date" value={carEnd} onChange={(e) => setCarEnd(e.target.value)} aria-invalid={!!fieldErrors.carEnd} />
                  </div>
                </div>
              )}
              {fieldErrors.carEnd && <p className="text-sm text-destructive" role="alert">{fieldErrors.carEnd}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Guest</Label>
          {selectedGuest ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm">
                Booking for <span className="font-medium">{selectedGuest.full_name}</span>
                <button
                  type="button"
                  onClick={clearSelectedGuest}
                  aria-label="Clear selected guest"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              </span>
              {selectedGuest.email && <span className="text-sm text-muted-foreground">{selectedGuest.email}</span>}
            </div>
          ) : loadingGuest && guestId ? (
            <p className="text-sm text-muted-foreground">Loading guest...</p>
          ) : (
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
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={guestNationality} onChange={(e) => setGuestNationality(e.target.value)} placeholder="e.g. Sri Lankan" />
              </div>
              <div className="space-y-2">
                <Label>NIC / Passport</Label>
                <Input value={guestNicPassport} onChange={(e) => setGuestNicPassport(e.target.value)} placeholder="NIC or passport number" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Number of Guests</Label>
          <Input type="number" min={1} max={20} value={numGuests} onChange={(e) => setNumGuests(Math.max(1, Math.min(20, Number(e.target.value))))} />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or notes..." rows={3} />
        </div>

        <Button onClick={handleSubmit} disabled={submitting || loadingGuest} className="w-full">
          {submitting ? "Creating..." : loadingGuest ? "Loading guest..." : "Create Booking"}
        </Button>
      </CardContent>
    </Card>
  )
}