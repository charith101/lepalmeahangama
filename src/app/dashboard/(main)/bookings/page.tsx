import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BOOKING_STATUSES } from "@/lib/constants"
import { BookingsFilters } from "@/components/dashboard/BookingsFilters"

const PAGE_SIZE = 50

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status, q, page: pageParam } = await searchParams
  const supabase = await createClient()

  const statusFilter = BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])
    ? (status as (typeof BOOKING_STATUSES)[number])
    : undefined
  const sanitizedQ = (q ?? "").replace(/[%_,()]/g, "").trim()
  const pageNum = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE

  let builder = supabase
    .from("bookings")
    .select(
      "id, check_in, check_out, status, room_total_usd, source, created_at, guests!inner(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (statusFilter) builder = builder.eq("status", statusFilter)
  if (sanitizedQ) builder = builder.or(`guests.full_name.ilike.%${sanitizedQ}%,guests.email.ilike.%${sanitizedQ}%`)

  const { data: bookings, count } = await builder
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!statusFilter || !!sanitizedQ

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (q) params.set("q", q)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `/dashboard/bookings${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage all reservations.</p>
        </div>
        <Button render={<Link href="/dashboard/bookings/new" />}>New Booking</Button>
      </div>

      <BookingsFilters rows={bookings ?? []} />

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
                {hasFilters ? "No bookings match your filters." : "No bookings yet."}
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

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {Math.min(pageNum, totalPages)} of {totalPages} · {total} booking{total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Button variant="outline" size="sm" render={<Link href={pageHref(pageNum - 1)} />}>
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Previous</Button>
            )}
            {pageNum < totalPages ? (
              <Button variant="outline" size="sm" render={<Link href={pageHref(pageNum + 1)} />}>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Next</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
