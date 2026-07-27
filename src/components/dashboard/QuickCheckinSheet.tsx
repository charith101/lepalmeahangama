"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"

type PendingBooking = {
  id: string
  guest_id: string | null
  guests: { full_name: string } | null
  rooms: { room_number: string }
}

export function QuickCheckinSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [bookings, setBookings] = useState<PendingBooking[] | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [nicPassport, setNicPassport] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const today = new Date().toISOString().split("T")[0]
    supabase
      .from("bookings")
      .select("id, guest_id, guests(full_name), rooms(room_number)")
      .eq("status", "confirmed")
      .lte("check_in", today)
      .order("check_in")
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load bookings")
        else setBookings(data as unknown as PendingBooking[])
      })
  }, [open, supabase])

  async function handleCheckin() {
    if (!selectedId) { toast.error("Select a booking"); return }
    setLoading(true)
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "checked_in" })
        .eq("id", selectedId)
      if (error) throw error

      if (nicPassport) {
        const booking = bookings?.find((b) => b.id === selectedId)
        if (booking?.guest_id) {
          const { error: guestErr } = await supabase
            .from("guests")
            .update({ nic_or_passport: nicPassport })
            .eq("id", booking.guest_id)
          if (guestErr) throw guestErr
        }
      }

      toast.success("Guest checked in")
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { setBookings(null); setSelectedId(""); setNicPassport("") } }}>
      <SheetTrigger render={<Button />}>
        <LogIn className="size-4" />
        Quick Check-in
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Quick Check-in</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="space-y-2">
            <Label>Booking</Label>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")} disabled={bookings === null}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={bookings === null ? "Loading..." : "Select booking"} />
              </SelectTrigger>
              <SelectContent>
                {bookings === null ? (
                  <SelectItem value="_loading" disabled>Loading...</SelectItem>
                ) : bookings.length === 0 ? (
                  <SelectItem value="_empty" disabled>No pending check-ins</SelectItem>
                ) : (
                  bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.rooms.room_number} — {b.guests?.full_name ?? "Unknown"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>NIC / Passport (optional)</Label>
            <Input
              value={nicPassport}
              onChange={(e) => setNicPassport(e.target.value)}
              placeholder="Enter ID"
            />
          </div>
          <Button
            onClick={handleCheckin}
            disabled={loading || !selectedId || selectedId.startsWith("_")}
            className="w-full"
          >
            {loading ? "Checking in..." : "Confirm Check-in"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
