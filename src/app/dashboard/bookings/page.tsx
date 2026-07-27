import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status, room_total_usd, source, created_at, guests!inner(full_name)")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage all reservations.</p>
        </div>
        <Button render={<Link href="/dashboard/bookings/new" />}>New Booking</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!bookings?.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                No bookings yet.
              </TableCell>
            </TableRow>
          )}
          {bookings?.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.guests?.full_name}</TableCell>
              <TableCell>{b.check_in}</TableCell>
              <TableCell>{b.check_out}</TableCell>
              <TableCell><span className="capitalize">{b.status?.replace(/_/g, " ")}</span></TableCell>
              <TableCell>${b.room_total_usd?.toFixed(2)}</TableCell>
              <TableCell className="capitalize">{b.source}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" render={<Link href={`/dashboard/bookings/${b.id}`} />}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
