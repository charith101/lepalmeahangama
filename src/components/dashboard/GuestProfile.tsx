"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "secondary",
  confirmed: "default",
  checked_in: "default",
  checked_out: "outline",
  cancelled: "destructive",
  no_show: "destructive",
}

type GuestProfileData = {
  guest: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    nic_or_passport: string | null
    nationality: string | null
    created_at: string
  }
  bookings: Array<{
    id: string
    check_in: string
    check_out: string
    status: string
    room_total_usd: number | null
    rooms: { room_number: string; room_categories: { name: string } } | null
  }>
  totalSpent: number
  totalPaid: number
  outstanding: number
}

export function GuestProfile({ data }: { data: GuestProfileData }) {
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.guest.full_name}</h1>
        <p className="text-sm text-muted-foreground">Guest since {format(new Date(data.guest.created_at), "PP")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Email:</span> {data.guest.email ?? "—"}</div>
          <div><span className="text-muted-foreground">Phone:</span> {data.guest.phone ?? "—"}</div>
          <div><span className="text-muted-foreground">NIC/Passport:</span> {data.guest.nic_or_passport ?? "—"}</div>
          <div><span className="text-muted-foreground">Nationality:</span> {data.guest.nationality ?? "—"}</div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${data.outstanding > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(data.outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking History ({data.bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous bookings</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bookings.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/bookings/${b.id}`)}>
                    <TableCell className="font-medium">
                      {b.rooms?.room_number ?? "—"} {b.rooms?.room_categories?.name ?? ""}
                    </TableCell>
                    <TableCell>{format(new Date(b.check_in), "PP")}</TableCell>
                    <TableCell>{format(new Date(b.check_out), "PP")}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[b.status] ?? "outline"}>
                        {b.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.room_total_usd ? formatCurrency(b.room_total_usd) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => router.push(`/dashboard/guests`)} variant="outline">
          Back to Guests
        </Button>
        <Button onClick={() => router.push(`/dashboard/bookings/new?guestId=${encodeURIComponent(data.guest.id)}`)}>
          New Booking for {data.guest.full_name.split(" ")[0]}
        </Button>
      </div>
    </div>
  )
}
