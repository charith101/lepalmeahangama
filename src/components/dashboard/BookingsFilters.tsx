"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { BOOKING_STATUSES } from "@/lib/constants"

export type BookingRow = {
  id: string
  check_in: string
  check_out: string
  status: string
  room_total_usd: number | null
  source: string
  created_at: string
  guests: { full_name: string; email: string | null } | null
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ")
}

export function BookingsFilters({ rows }: { rows: BookingRow[] }) {
  const searchParams = useSearchParams()
  const status = searchParams.get("status") ?? ""
  const q = searchParams.get("q") ?? ""

  function exportCSV() {
    const header = "Guest,Email,Check-in,Check-out,Status,Total,Source,Created At"
    const csvRows = rows.map((b) =>
      [
        b.guests?.full_name ?? "",
        b.guests?.email ?? "",
        b.check_in,
        b.check_out,
        statusLabel(b.status),
        b.room_total_usd != null ? b.room_total_usd.toFixed(2) : "",
        b.source,
        new Date(b.created_at).toLocaleDateString(),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    )
    const csv = [header, ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bookings.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const chips: Array<{ value: string; label: string }> = [
    { value: "", label: "All" },
    ...BOOKING_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {chips.map((c) => {
          const params = new URLSearchParams()
          if (c.value) params.set("status", c.value)
          if (q) params.set("q", q)
          const qs = params.toString()
          return (
            <Link
              key={c.value || "all"}
              href={`/dashboard/bookings${qs ? `?${qs}` : ""}`}
              className={cn(
                "rounded-full border border-input px-3 py-1 text-sm capitalize transition-colors hover:bg-muted",
                status === c.value && "border-primary bg-primary/10 font-medium"
              )}
            >
              {c.label}
            </Link>
          )
        })}
      </div>
      <form method="get" action="/dashboard/bookings" className="relative ml-auto w-full max-w-xs">
        {status && <input type="hidden" name="status" value={status} />}
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input key={q} name="q" defaultValue={q} placeholder="Search guest name or email..." className="pl-8" />
      </form>
      <Button variant="outline" onClick={exportCSV}>
        <DownloadIcon />
        Export CSV
      </Button>
    </div>
  )
}
