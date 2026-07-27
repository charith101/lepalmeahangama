"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { dashboardBookingSchema } from "@/lib/validations"

type Category = { id: string; name: string; base_price_usd: number }
type Room = { id: string; room_number: string; category_id: string; operational_status: string }

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
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [availableRoomIds, setAvailableRoomIds] = useState<Set<string> | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setAvailableRoomIds(null)
      return
    }
    let ignore = false
    const fetchAvailable = async () => {
      setLoadingAvailability(true)
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const { data: booked } = await supabase
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
    return true
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

      const { data: user } = await supabase.auth.getUser()

      const { error: bookingError } = await supabase.from("bookings").insert({
        guest_id: guestResult.data.id,
        room_id: roomId!,
        check_in: format(checkIn!, "yyyy-MM-dd"),
        check_out: format(checkOut!, "yyyy-MM-dd"),
        status: "confirmed",
        source: source as "walk_in" | "ota_manual",
        ota_name: source === "ota_manual" ? otaName.trim() : null,
        notes: notes.trim() || null,
        created_by_staff_id: user.user?.id ?? null,
        num_guests: 1,
      })

      if (bookingError) throw new Error(bookingError.message)

      toast.success("Booking created")
      router.push("/dashboard/calendar")
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
