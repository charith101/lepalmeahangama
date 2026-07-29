import type { Metadata } from "next"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { bookingOrderSchema } from "@/lib/seo"
import { CheckCircle } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"

export const dynamic = "force-dynamic"

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
    .select("id, check_in, check_out, room_total_usd, status, rooms(room_number, room_categories(name))")
    .eq("id", id)
    .single()

  if (!booking) return { robots: { index: false, follow: false } }

  const bookingMeta = booking as unknown as { rooms: { room_number: string; room_categories: { name: string } } | null }
  const metaRoom = bookingMeta.rooms

  return {
    title: `Booking Confirmed — ${metaRoom?.room_categories?.name || "Room"} — Le Palme Ahangama`,
    description: `Booking confirmed at Le Palme Ahangama. ${metaRoom?.room_categories?.name || "Room"} from ${booking.check_in} to ${booking.check_out}. Total: ${formatCurrency(Number(booking.room_total_usd ?? 0))}.`,
    robots: { index: false, follow: true },
  }
}

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status, room_total_usd, created_at, group_booking_id, rooms(room_number, room_categories(name)), guests(full_name, email, phone)")
    .eq("id", id)
    .single()

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

        <div className="text-center space-y-3">
          <CheckCircle className="size-10 mx-auto text-aloe-10" strokeWidth={1.5} />
          <h1 className="text-3xl font-light tracking-tight text-ink dark:text-on-primary">Booking Confirmed</h1>
          <p className="text-sm text-muted-foreground">Your booking has been confirmed. A confirmation email will be sent.</p>
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
            <span className="text-lg font-light text-ink dark:text-on-primary">{formatCurrency(Number(booking.room_total_usd ?? 0))}</span>
          </div>
        </div>

        <Link href="/" className="block w-full text-center">
          <span className="inline-flex h-11 items-center justify-center rounded-pill bg-ink dark:bg-on-primary text-on-primary dark:text-ink px-8 text-sm font-medium hover:bg-ink/90 dark:hover:bg-on-primary/90 transition-colors">
            Back to Home
          </span>
        </Link>
      </div>
    </div>
  )
}
