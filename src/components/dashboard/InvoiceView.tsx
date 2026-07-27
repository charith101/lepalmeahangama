"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"

type Invoice = {
  id: string
  status: string
  room_charges_total_usd: number
  addon_charges_total_usd: number
  surcharge_pct_applied: number
  grand_total_usd: number
  issued_at: string | null
}

export function InvoiceView({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoice</CardTitle>
        <Badge variant={invoice.status === "paid" ? "default" : "secondary"} className="capitalize">{invoice.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Room charges</span>
          <span>{formatCurrency(invoice.room_charges_total_usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Add-on charges</span>
          <span>{formatCurrency(invoice.addon_charges_total_usd)}</span>
        </div>
        {invoice.surcharge_pct_applied > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surcharge ({invoice.surcharge_pct_applied}%)</span>
            <span>{formatCurrency((invoice.room_charges_total_usd + invoice.addon_charges_total_usd) * invoice.surcharge_pct_applied / 100)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>Grand Total</span>
          <span>{formatCurrency(invoice.grand_total_usd)}</span>
        </div>
        {invoice.issued_at && (
          <p className="text-xs text-muted-foreground pt-1">
            Issued {format(new Date(invoice.issued_at), "PPp")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
