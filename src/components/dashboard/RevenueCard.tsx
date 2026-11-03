"use client"

import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { formatHotelDateTime } from "@/lib/datetime"

type Payment = {
  id: string
  amount_usd: number
  paid_at: string | null
  method: string
  booking_id: string
  guest_name: string | null
}

type Period = "today" | "month" | "outstanding"

const periodLabels: Record<Period, string> = {
  today: "Today",
  month: "This Month",
  outstanding: "Outstanding",
}

export function RevenueCard({
  todayRevenue,
  monthToDate,
  outstanding,
  payments,
  today,
  monthStart,
  issuedBookingIds,
}: {
  todayRevenue: number
  monthToDate: number
  outstanding: number
  payments: Payment[]
  today: string
  monthStart: string
  issuedBookingIds: string[]
}) {
  const [period, setPeriod] = useState<Period | null>(null)

  const inDay = (p: Payment, day: string) => {
    if (!p.paid_at) return false
    const t = Date.parse(p.paid_at)
    return t >= Date.parse(`${day}T00:00:00Z`) && t <= Date.parse(`${day}T23:59:59Z`)
  }

  const rows =
    period === "today"
      ? payments.filter((p) => inDay(p, today))
      : period === "month"
        ? payments.filter((p) => p.paid_at && Date.parse(p.paid_at) >= Date.parse(`${monthStart}T00:00:00Z`))
        : period === "outstanding"
          ? payments.filter((p) => issuedBookingIds.includes(p.booking_id))
          : []

  const rowsTotal = rows.reduce((s, p) => s + p.amount_usd, 0)

  function exportCSV() {
    const header = "Date,Guest,Amount,Method"
    const csvRows = rows.map((p) =>
      [
        p.paid_at ? formatHotelDateTime(p.paid_at) : "",
        p.guest_name ?? "",
        p.amount_usd.toFixed(2),
        p.method.replace(/_/g, " "),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(","),
    )
    const csv = [header, ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `revenue-${period ?? "payments"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const rowButtonClass =
    "flex w-full cursor-pointer items-center justify-between -mx-1 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button type="button" className={rowButtonClass} onClick={() => setPeriod("today")}>
          <span className="text-muted-foreground">Today</span>
          <span className="font-semibold">{formatCurrency(todayRevenue)}</span>
        </button>
        <button type="button" className={rowButtonClass} onClick={() => setPeriod("month")}>
          <span className="text-muted-foreground">This Month</span>
          <span className="font-semibold">{formatCurrency(monthToDate)}</span>
        </button>
        <button type="button" className={rowButtonClass} onClick={() => setPeriod("outstanding")}>
          <span className="text-muted-foreground">Outstanding</span>
          <span className="font-semibold text-destructive">{formatCurrency(outstanding)}</span>
        </button>
      </CardContent>

      <Dialog open={period !== null} onOpenChange={(open) => { if (!open) setPeriod(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{period ? periodLabels[period] : ""}</DialogTitle>
            {period && (
              <p className="text-xs text-muted-foreground">
                {rows.length} payment{rows.length === 1 ? "" : "s"} · {formatCurrency(rowsTotal)}
              </p>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments to show.</p>
            ) : (
              rows.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.guest_name ?? "Guest"}</p>
                    <p className="text-muted-foreground">
                      {p.paid_at ? formatHotelDateTime(p.paid_at) : "—"} · {p.method.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatCurrency(p.amount_usd)}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={rows.length === 0}>
              <DownloadIcon />
              Export CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
