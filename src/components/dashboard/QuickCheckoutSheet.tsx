"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import type { Database } from "@/lib/supabase/database.types"
import { formatCurrency } from "@/lib/utils"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]
type ChargeRow = Database["public"]["Tables"]["booking_charges"]["Row"]
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"]

export function QuickCheckoutSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [bookings, setBookings] = useState<Array<Pick<BookingRow, "id"> & { guests: { full_name: string } | null; rooms: { room_number: string } | null }> | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [invoiceData, setInvoiceData] = useState<InvoiceRow | null>(null)
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [collectPayment, setCollectPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")

  useEffect(() => {
    if (!open) return
    const today = new Date().toISOString().split("T")[0]
    supabase
      .from("bookings")
      .select("id, guests(full_name), rooms(room_number)")
      .eq("status", "checked_in")
      .lte("check_in", today)
      .order("check_in")
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load bookings")
        else setBookings(data as typeof bookings)
      })
  }, [open, supabase])

  useEffect(() => {
    if (!selectedId || selectedId.startsWith("_")) return
    const fetchDetails = async () => {
      const [invRes, chgRes, payRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("booking_id", selectedId).maybeSingle(),
        supabase.from("booking_charges").select("*").eq("booking_id", selectedId),
        supabase.from("payments").select("*").eq("booking_id", selectedId),
      ])
      setInvoiceData(invRes.data)
      setCharges(chgRes.data ?? [])
      setPayments(payRes.data ?? [])
      setCollectPayment(false)
    }
    fetchDetails()
  }, [selectedId, supabase])

  const roomTotal = invoiceData?.room_charges_total_usd ?? 0
  const addonTotal = invoiceData?.addon_charges_total_usd ?? charges.reduce((s, c) => s + Number(c.line_total_usd || 0), 0)
  const surchargePct = invoiceData?.surcharge_pct_applied ?? 0
  const grandTotal = roomTotal + addonTotal + (roomTotal + addonTotal) * (surchargePct / 100)
  const paidTotal = payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const balanceDue = Math.max(0, grandTotal - paidTotal)

  async function handleCheckout() {
    if (!selectedId || selectedId.startsWith("_")) { toast.error("Select a booking"); return }
    setLoading(true)
    try {
      if (collectPayment && parseFloat(paymentAmount) > 0) {
        const { error: payErr } = await supabase.from("payments").insert({
          booking_id: selectedId,
          amount_usd: parseFloat(paymentAmount),
          method: paymentMethod as Database["public"]["Enums"]["payment_method"],
          status: "completed",
          paid_at: new Date().toISOString(),
        })
        if (payErr) throw payErr
      }

      const { error: bookErr } = await supabase
        .from("bookings")
        .update({ status: "checked_out" })
        .eq("id", selectedId)
      if (bookErr) throw bookErr

      toast.success("Guest checked out")
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-out failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { setBookings(null); setSelectedId(""); setInvoiceData(null); setCollectPayment(false) } }}>
      <SheetTrigger render={<Button variant="outline" />}>
        <LogOut className="size-4" />
        Quick Check-out
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Quick Check-out</SheetTitle>
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
                  <SelectItem value="_empty" disabled>No checked-in guests</SelectItem>
                ) : (
                  bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.rooms?.room_number ?? "?"} — {b.guests?.full_name ?? "Unknown"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedId && !selectedId.startsWith("_") && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room charges</span>
                  <span>{formatCurrency(roomTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-on charges</span>
                  <span>{formatCurrency(addonTotal)}</span>
                </div>
                {surchargePct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surcharge ({surchargePct}%)</span>
                    <span>{formatCurrency((roomTotal + addonTotal) * surchargePct / 100)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span>{formatCurrency(paidTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              </div>

              {balanceDue > 0 && !collectPayment && (
                <Button variant="outline" onClick={() => setCollectPayment(true)} size="sm">
                  Collect Payment
                </Button>
              )}

              {collectPayment && (
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-xs font-medium">Payment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Amount (due: ${formatCurrency(balanceDue)})`}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {(["cash", "bank_transfer", "card_payhere"] as const).map((m) => (
                      <Button
                        key={m}
                        variant={paymentMethod === m ? "default" : "outline"}
                        size="xs"
                        onClick={() => setPaymentMethod(m)}
                        className="capitalize text-xs h-7"
                      >
                        {m.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              <Button onClick={handleCheckout} disabled={loading || !selectedId} className="w-full">
                {loading ? "Processing..." : "Complete Check-out"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
