import type { Metadata } from "next"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCurrency } from "@/lib/utils"
import { BOARD_LABEL } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { bookingOrderSchema } from "@/lib/seo"
import { CheckCircle } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"
import { computeBookingTotal } from "@/lib/booking-pricing"
import { formatHotelDateTime } from "@/lib/datetime"
import { StatusRefresher } from "./status-refresher"

export const dynamic = "force-dynamic"

// "14:00:00" (settings wall-clock value) → "2:00 PM"
function formatWallClock(value: string | null | undefined): string {
  const [h, m] = (value ?? "").split(":")
  const hour = Number(h)
  if (!h || Number.isNaN(hour)) return ""
  return `${((hour + 11) % 12) + 1}:${m || "00"} ${hour >= 12 ? "PM" : "AM"}`
}

// bk09: heading/copy derive from the live status so "Pending Payment" bookings
// are never told they are confirmed. confirmed/checked_in/checked_out keep the
// confirmed wording.
const statusCopy: Record<string, { heading: string; copy: string }> = {
  pending_payment: {
    heading: "Complete your payment to confirm",
    copy: "Your booking is held for you but is not confirmed yet. Complete your payment to confirm it — we'll send a confirmation email once it goes through.",
  },
  cancelled: {
    heading: "Booking cancelled",
    copy: "This booking has been cancelled. If you think this is a mistake, please contact us.",
  },
}
const confirmedCopy = {
  heading: "Booking Confirmed",
  copy: "Your booking has been confirmed. A confirmation email will be sent.",
}

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  no_show: "No Show",
  maintenance_block: "Maintenance",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "outline",
  confirmed: "default",
  checked_in: "secondary",
  cancelled: "destructive",
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, room_total_usd, board_total_usd, status, rooms(room_number, room_categories(name))")
    .eq("id", id)
    .single()

  if (!booking) return { robots: { index: false, follow: false } }

  const bookingMeta = booking as unknown as { rooms: { room_number: string; room_categories: { name: string } } | null }
  const metaRoom = bookingMeta.rooms
  const metaTotal = Number(booking.room_total_usd ?? 0) + Number(booking.board_total_usd ?? 0)
  const metaConfirmed = booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "checked_out"

  return {
    title: `${metaConfirmed ? "Booking Confirmed" : "Booking"} — ${metaRoom?.room_categories?.name || "Room"} — Le Palme Ahangama`,
    description: `${metaConfirmed ? "Booking confirmed at" : "Booking at"} Le Palme Ahangama. ${metaRoom?.room_categories?.name || "Room"} from ${booking.check_in} to ${booking.check_out}. Total: ${formatCurrency(metaTotal)}.`,
    robots: { index: false, follow: true },
  }
}

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, room_total_usd, board_plan, board_total_usd, status, created_at, group_booking_id, rooms(room_number, room_categories(name)), guests(full_name, email, phone), equipment_bookings(equipment_units(equipment_categories(name)), start_date, end_date, price_usd), airport_transfers(direction, flight_number, transfer_datetime, price_usd)")
    .eq("id", id)
    .single()

  const { data: settings } = await supabase
    .from("settings").select("surcharge_pct, check_in_time, check_out_time").eq("id", true).maybeSingle()

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-light text-ink dark:text-on-primary">Booking not found</h1>
          <p className="text-sm text-muted-foreground">The booking you are looking for does not exist.</p>
          <Link href="/" className="text-sm text-muted-foreground underline-offset-2 hover:underline">Back to Home</Link>
        </div>
      </div>
    )
  }

  type BookingWithJoins = Database["public"]["Tables"]["bookings"]["Row"] & {
    rooms: Database["public"]["Tables"]["rooms"]["Row"] & {
      room_categories: Database["public"]["Tables"]["room_categories"]["Row"] | null
    } | null
    guests: Database["public"]["Tables"]["guests"]["Row"] | null
  }
  const b = booking as unknown as BookingWithJoins
  const room = b.rooms
  const guest = b.guests
  const category = room?.room_categories

  type EquipmentRow = { start_date: string; end_date: string; price_usd: number | null; equipment_units: { equipment_categories: { name: string } } | null }
  type TransferRow = { direction: string; flight_number: string | null; transfer_datetime: string; price_usd: number | null }
  const rentals = (booking.equipment_bookings ?? []) as unknown as EquipmentRow[]
  const transfers = (booking.airport_transfers ?? []) as unknown as TransferRow[]
  const rentalTotal = rentals.reduce((s, r) => s + Number(r.price_usd || 0), 0)
  const transferTotal = transfers.reduce((s, t) => s + Number(t.price_usd || 0), 0)
  const surchargePct = Number(settings?.surcharge_pct || 0)
  const roomTotal = Number(booking.room_total_usd || 0) + Number(booking.board_total_usd || 0) + rentalTotal + transferTotal
  // N11/§5.4: grand total spans the whole group (every room + all extras + surcharge),
  // mirroring computeBookingTotal — the amount PayHere actually charged. Legacy rows
  // without a group_booking_id have no siblings, so the single-row math is the total.
  const groupId = b.group_booking_id ?? booking.id
  const groupTotal = await computeBookingTotal(groupId)
  const grandTotal = "total" in groupTotal ? groupTotal.total : roomTotal * (1 + surchargePct / 100)

  const checkInTime = formatWallClock(settings?.check_in_time)
  const checkOutTime = formatWallClock(settings?.check_out_time)
  const stayTimes = [
    checkInTime && `Check-in from ${checkInTime}`,
    checkOutTime && `Check-out by ${checkOutTime}`,
  ].filter(Boolean).join(" · ")

  const copy = statusCopy[booking.status] ?? confirmedCopy

  const schema = bookingOrderSchema(
    booking.id,
    category?.name || "Room",
    booking.check_in,
    booking.check_out,
    Number(booking.room_total_usd ?? 0),
    booking.status
  )

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        {(booking.status === "pending_payment" || booking.status === "cancelled") && <StatusRefresher />}

        <div className="text-center space-y-3">
          <CheckCircle className="size-10 mx-auto text-aloe-10" strokeWidth={1.5} />
          <h1 className="text-3xl font-light tracking-tight text-ink dark:text-on-primary">{copy.heading}</h1>
          <p className="text-sm text-muted-foreground">{copy.copy}</p>
        </div>

        <div className="rounded-lg border border-hairline-light dark:border-hairline-dark p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reference</span>
            <span className="text-sm font-mono text-ink dark:text-on-primary">{(b.group_booking_id ?? booking.id).slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={statusVariants[booking.status] || "outline"} className="rounded-pill">
              {statusLabels[booking.status] || booking.status}
            </Badge>
          </div>
          {room && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Room</span>
              <span className="text-sm font-medium text-ink dark:text-on-primary">{room.room_number} &mdash; {category?.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Check-in</span>
            <span className="text-sm text-ink dark:text-on-primary">{booking.check_in}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Check-out</span>
            <span className="text-sm text-ink dark:text-on-primary">{booking.check_out}</span>
          </div>
          {stayTimes && (
            <p className="text-xs text-muted-foreground text-center">{stayTimes}</p>
          )}
          {Number(booking.board_total_usd ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Board plan</span>
              <span className="text-sm font-medium text-ink dark:text-on-primary">{BOARD_LABEL(booking.board_plan)} &mdash; {formatCurrency(Number(booking.board_total_usd))}</span>
            </div>
          )}
          {rentals.map((eq, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{eq.equipment_units?.equipment_categories?.name ?? "Equipment"}</span>
              <span className="text-sm text-ink dark:text-on-primary">{eq.start_date} &rarr; {eq.end_date}{eq.price_usd ? ` &middot; ${formatCurrency(eq.price_usd)}` : ""}</span>
            </div>
          ))}
          {transfers.map((t, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transfer ({t.direction})</span>
              <span className="text-sm text-ink dark:text-on-primary">{formatHotelDateTime(t.transfer_datetime)}{t.flight_number ? ` &middot; ${t.flight_number}` : ""}{t.price_usd ? ` &middot; ${formatCurrency(t.price_usd)}` : ""}</span>
            </div>
          ))}
          {guest && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Guest</span>
                <span className="text-sm font-medium text-ink dark:text-on-primary">{guest.full_name}</span>
              </div>
              {guest.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm text-ink dark:text-on-primary">{guest.email}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center justify-between border-t border-hairline-light dark:border-hairline-dark pt-4">
            <span className="text-sm font-medium text-ink dark:text-on-primary">Grand Total</span>
            <span className="text-lg font-light text-ink dark:text-on-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <Link href="/" className="block w-full text-center">
          <span className="inline-flex h-11 items-center justify-center rounded-pill bg-ink dark:bg-on-primary text-on-primary dark:text-ink px-8 text-sm font-medium hover:bg-ink/90 dark:hover:bg-on-primary/90 transition-colors">
            Back to Home
          </span>
        </Link>
        <p className="text-center">
          <Link href="/booking/lookup" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
            Look up your booking later
          </Link>
        </p>
      </div>
    </div>
  )
}
