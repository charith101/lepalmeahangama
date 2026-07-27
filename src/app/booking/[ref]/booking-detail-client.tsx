"use client"

import { format, parseISO } from "date-fns"
import { Palmtree, CalendarDays, User, MapPin, Phone, Mail, Hash, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  checked_in: { label: "Checked In", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  checked_out: { label: "Checked Out", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BookingData = Record<string, any> & {
  id: string
  check_in: string
  check_out: string
  status: string
  source: string
  room_total_usd: number | null
  num_guests: number | null
  notes: string | null
  created_at: string
  group_booking_id: string | null
  guests: {
    full_name: string
    email: string | null
    phone: string | null
    nationality: string | null
    nic_or_passport: string | null
  } | null
  rooms: {
    room_number: string
    room_categories: { name: string } | null
  } | null
}

export function BookingDetailClient({ bookings }: { bookings: BookingData[] }) {
  const guest = bookings[0]?.guests
  const refCode = bookings[0]?.group_booking_id?.slice(0, 8).toUpperCase() ?? "—"

  const nights = bookings.length > 0
    ? Math.round(
        (new Date(bookings[0].check_out).getTime() - new Date(bookings[0].check_in).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  const roomTotal = bookings.reduce((sum, b) => sum + (b.room_total_usd ?? 0), 0)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Palmtree className="size-5 text-ink dark:text-on-primary" />
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground">
              Le Palme Ahangama
            </p>
          </div>
          <h1 className="text-[clamp(1.5rem,4vw,2.2rem)] font-light leading-[1.14] text-ink dark:text-on-primary">
            Your Booking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reference: <span className="font-mono font-medium text-ink dark:text-on-primary tracking-wider">{refCode}</span>
          </p>
        </div>

        {bookings.map((booking) => {
          const statusInfo = statusLabels[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-800" }
          const checkInDate = booking.check_in ? format(parseISO(booking.check_in), "PPP") : "—"
          const checkOutDate = booking.check_out ? format(parseISO(booking.check_out), "PPP") : "—"

          return (
            <Card key={booking.id} className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-ink dark:text-on-primary">
                    Room {booking.rooms?.room_number ?? "—"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {booking.rooms?.room_categories?.name ?? "—"}
                  </p>
                </div>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Check-in</p>
                        <p>{checkInDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Check-out</p>
                        <p>{checkOutDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Duration</p>
                        <p>{nights} {nights === 1 ? "night" : "nights"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Guests</p>
                        <p>{booking.num_guests ?? 1} guest{booking.num_guests !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Room Total</p>
                        <p>{booking.room_total_usd ? formatCurrency(booking.room_total_usd) : "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      <div>
                        <p className="font-medium text-ink dark:text-on-primary">Source</p>
                        <p className="capitalize">{booking.source.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-ink dark:text-on-primary">Guest Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4 shrink-0" />
                <span>{guest?.full_name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>{guest?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                <span>{guest?.phone ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{guest?.nationality ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <p>
            Total room charges: <span className="font-semibold text-ink dark:text-on-primary">{formatCurrency(roomTotal)}</span>
          </p>
          {bookings[0]?.notes && (
            <p className="mt-2 italic">{bookings[0].notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
