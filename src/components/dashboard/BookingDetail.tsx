"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { BOARD_LABEL } from "@/lib/constants"
import { recordPaymentSchema } from "@/lib/validations"
import { ChargeForm } from "./ChargeForm"
import { InvoiceView } from "./InvoiceView"
import { moveGuestToRoom } from "@/lib/actions/rooms"
import {
  checkIn, checkOut, cancelBooking, updateBookingStatus, recordDeposit, refundBookingPayment
} from "@/lib/actions/bookings"
import { generateInvoice, recordPayment } from "@/lib/actions/billing"
import { confirmBankTransfer } from "@/lib/actions/billing"

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "secondary",
  confirmed: "default",
  checked_in: "default",
  checked_out: "outline",
  cancelled: "destructive",
  no_show: "destructive",
  maintenance_block: "outline",
}

type Booking = {
  id: string
  status: string
  check_in: string
  check_out: string
  source: string
  ota_name: string | null
  notes: string | null
  room_total_usd: number | null
  board_plan: string | null
  board_total_usd: number | null
  num_guests: number | null
  created_at: string
  guests: { id: string; full_name: string; email: string | null; phone: string | null; nic_or_passport: string | null; nationality: string | null } | null
  rooms: { id: string; room_number: string; category_id: string; room_categories: { name: string } }
  booking_charges: Array<{ id: string; description: string; category: string; quantity: number; unit_price_usd: number; line_total_usd: number; created_at: string }>
  invoices: Array<{ id: string; status: string; room_charges_total_usd: number; addon_charges_total_usd: number; surcharge_pct_applied: number; grand_total_usd: number; issued_at: string | null }>
  payments: Array<{ id: string; amount_usd: number; method: string; status: string; paid_at: string | null }>
}

export function BookingDetail({ booking, minDepositPct = 50 }: { booking: Booking; minDepositPct?: number }) {
  const router = useRouter()
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [nicPassport, setNicPassport] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string | null>("cash")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [charges, setCharges] = useState(booking.booking_charges)
  const [payments, setPayments] = useState(booking.payments)
  const [invoices, setInvoices] = useState(booking.invoices)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState("")
  const [showMoveRoomDialog, setShowMoveRoomDialog] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<Array<{ id: string; room_number: string; room_categories: { name: string } }>>([])
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [loadingRooms, setLoadingRooms] = useState(false)

  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [printInvoice, setPrintInvoice] = useState<{
    id: string; status: string; room_charges_total_usd: number
    addon_charges_total_usd: number; surcharge_pct_applied: number
    grand_total_usd: number; issued_at: string | null
  } | null>(null)

  const invoice = invoices[0]

  const depositDue = (booking.room_total_usd ?? 0) * (minDepositPct / 100)
  const depositReceived = payments
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount_usd, 0)
  const depositRemaining = Math.max(0, depositDue - depositReceived)
  const isDepositMet = depositReceived >= depositDue

  async function handleAction(action: string, extra?: { nic_or_passport?: string }) {
    setActionLoading(action)
    try {
      if (action === "checked_in" && extra?.nic_or_passport) {
        const { error } = await checkIn(booking.id, extra.nic_or_passport ?? "")
        if (error) throw new Error(error)
      } else if (action === "checked_out") {
        const { error } = await checkOut(booking.id)
        if (error) throw new Error(error)
      } else if (action === "cancelled") {
        const { error } = await cancelBooking(booking.id)
        if (error) throw new Error(error)
      } else {
        const { error } = await updateBookingStatus(booking.id, action as any)
        if (error) throw new Error(error)
      }
      toast.success(`Booking ${action.replace("_", " ")}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRecordPayment() {
    const amount = parseFloat(paymentAmount)
    const result = recordPaymentSchema.safeParse({ amount, method: paymentMethod })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }
    setActionLoading("payment")
    try {
      const { error } = await recordPayment(booking.id, {
        amount_usd: amount,
        method: paymentMethod as "cash" | "bank_transfer" | "card_payhere",
        invoice_id: invoice?.id ?? undefined,
      })
      if (error) throw new Error(error)
      toast.success("Payment recorded")
      setPaymentAmount("")
      setShowPaymentDialog(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateInvoice() {
    setActionLoading("invoice")
    try {
      const { data, error } = await generateInvoice(booking.id)
      if (error) throw new Error(error)
      if (data) {
        setPrintInvoice({
          id: "",
          status: "issued",
          room_charges_total_usd: data.roomTotal,
          addon_charges_total_usd: data.addonTotal,
          surcharge_pct_applied: data.surchargePct,
          grand_total_usd: data.grandTotal,
          issued_at: new Date().toISOString(),
        })
        setShowInvoiceDialog(true)
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate invoice")
    } finally {
      setActionLoading(null)
    }
  }

  function handlePrintInvoice() {
    if (!printInvoice) return
    const i = printInvoice
    const surchargeAmount = i.surcharge_pct_applied > 0
      ? (i.room_charges_total_usd + i.addon_charges_total_usd) * i.surcharge_pct_applied / 100
      : 0

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - Le Palme Ahangama</title>
  <style>
    @page { margin: 0.3in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; padding: 0.75in; }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .header h1 { font-size: 1.4rem; }
    .header p { font-size: 0.8rem; color: #666; }
    hr { border: none; border-top: 1px solid #ccc; margin: 0.75rem 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 2rem; margin: 1rem 0; font-size: 0.9rem; }
    .grid label { display: block; font-size: 0.75rem; color: #666; }
    .grid span { font-weight: 500; }
    .row { display: flex; justify-content: space-between; font-size: 0.9rem; margin: 0.35rem 0; }
    .row .lbl { color: #666; }
    .total { display: flex; justify-content: space-between; font-size: 1rem; font-weight: 700; margin-top: 0.75rem; }
    .footer { text-align: center; font-size: 0.75rem; color: #666; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Le Palme Ahangama</h1>
    <p>Hotel Invoice</p>
  </div>
  <hr>
  <div class="grid">
    <div><label>Guest</label><span>${escapeHtml(booking.guests?.full_name ?? "—")}</span></div>
    <div><label>Room</label><span>${escapeHtml(booking.rooms.room_number)} — ${escapeHtml(booking.rooms.room_categories.name)}</span></div>
    <div><label>Check-in</label><span>${format(new Date(booking.check_in), "PP")}</span></div>
    <div><label>Check-out</label><span>${format(new Date(booking.check_out), "PP")}</span></div>
  </div>
  <hr>
  <div class="row"><span class="lbl">Room charges</span><span>${formatCurrency(i.room_charges_total_usd)}</span></div>
  <div class="row"><span class="lbl">Add-on charges</span><span>${formatCurrency(i.addon_charges_total_usd)}</span></div>
  ${i.surcharge_pct_applied > 0 ? `<div class="row"><span class="lbl">Surcharge (${i.surcharge_pct_applied}%)</span><span>${formatCurrency(surchargeAmount)}</span></div>` : ""}
  <hr>
  <div class="total"><span>Grand Total</span><span>${formatCurrency(i.grand_total_usd)}</span></div>
  ${i.issued_at ? `<div class="footer">Issued ${format(new Date(i.issued_at), "PPp")}</div>` : ""}
  <script>window.print(); window.onafterprint = function(){ window.close() }<\/script>
</body>
</html>`

    const win = window.open("", "_blank")
    if (!win) { toast.error("Pop-up blocked. Allow pop-ups and try again."); return }
    win.document.write(html)
    win.document.close()
  }

  const submittingRef = useRef(false)

  async function handleConfirmBankTransfer() {
    if (submittingRef.current) return
    submittingRef.current = true
    setActionLoading("confirm")
    try {
      const { error } = await confirmBankTransfer(booking.id)
      if (error) throw new Error(error)
      toast.success("Payment confirmed — booking is now confirmed")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm payment")
    } finally {
      setActionLoading(null)
      submittingRef.current = false
    }
  }

  function renderActions() {
    switch (booking.status) {
      case "pending_payment":
        return (
          <div className="flex gap-2">
            {payments.some(p => p.status === "pending" && p.method === "bank_transfer") && (
              <Button onClick={handleConfirmBankTransfer} disabled={actionLoading !== null}>
                {actionLoading === "confirm" ? "Confirming..." : "Confirm Payment"}
              </Button>
            )}
            <Button variant="destructive" onClick={() => handleAction("cancelled")} disabled={actionLoading !== null}>Cancel</Button>
          </div>
        )
      case "confirmed":
        return (
          <div className="flex gap-2">
            <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
              <DialogTrigger render={<Button disabled={actionLoading !== null} />}>Check In</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Check In</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>NIC / Passport</Label>
                    <Input value={nicPassport} onChange={(e) => setNicPassport(e.target.value)} placeholder="Optional" />
                  </div>
                  <Button onClick={() => { handleAction("checked_in", { nic_or_passport: nicPassport }); setShowCheckInDialog(false) }} disabled={actionLoading !== null}>
                    Confirm Check In
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={() => handleAction("cancelled")} disabled={actionLoading !== null}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleAction("no_show")} disabled={actionLoading !== null}>No-show</Button>
          </div>
        )
      case "checked_in":
        return (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowChargeForm(true)} disabled={actionLoading !== null}>Post Charge</Button>
            <Button onClick={() => { setShowMoveRoomDialog(true) }} disabled={actionLoading !== null}>Move Room</Button>
            <Button onClick={handleGenerateInvoice} disabled={actionLoading !== null}>
              {actionLoading === "invoice" ? "Generating..." : "Generate Invoice"}
            </Button>
            <Button variant="secondary" onClick={() => handleAction("checked_out")} disabled={actionLoading !== null}>Check Out</Button>
          </div>
        )
      case "checked_out":
        return invoice ? null : <Button onClick={handleGenerateInvoice}>Generate Invoice</Button>
      default:
        return null
    }
  }

  useEffect(() => {
    if (!showMoveRoomDialog) return
    let ignore = false
    setLoadingRooms(true)
    setAvailableRooms([])
    setSelectedRoomId("")
    ;(async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data: conflictRows } = await supabase
        .from("bookings")
        .select("room_id")
        .in("status", ["confirmed", "checked_in", "pending_payment"])
        .lt("check_in", booking.check_out)
        .gt("check_out", booking.check_in)
        .neq("id", booking.id)
      if (ignore) return
      const booked = new Set((conflictRows ?? []).map((b: any) => b.room_id))
      const { data: rooms } = await supabase
        .from("bookings")
        .select("room_id")
        .in("status", ["confirmed", "checked_in", "pending_payment"])
        .lt("check_in", booking.check_out)
        .gt("check_out", booking.check_in)
      if (ignore) return
      const { data: allRooms } = await supabase
        .from("rooms")
        .select("*, room_categories(name)")
        .neq("id", booking.rooms.id)
        .eq("operational_status", "active")
        .order("room_number")
      if (!ignore) {
        setAvailableRooms((allRooms ?? []).filter((r) => !booked.has(r.id)) as any[])
        setLoadingRooms(false)
      }
    })()
    return () => { ignore = true }
  }, [showMoveRoomDialog])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booking</h1>
          <p className="text-muted-foreground text-sm">Room {booking.rooms.room_number} &middot; {booking.rooms.room_categories.name}</p>
        </div>
        <Badge variant={statusVariant[booking.status] ?? "outline"}>{booking.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Guest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {booking.guests?.full_name ?? "—"}</p>
            <p><span className="text-muted-foreground">Email:</span> {booking.guests?.email ?? "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {booking.guests?.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">NIC/Passport:</span> {booking.guests?.nic_or_passport ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Check-in:</span> {format(new Date(booking.check_in), "PP")}</p>
            <p><span className="text-muted-foreground">Check-out:</span> {format(new Date(booking.check_out), "PP")}</p>
            <p><span className="text-muted-foreground">Source:</span> {booking.source.replace("_", " ")} {booking.ota_name && `(${booking.ota_name})`}</p>
            <p><span className="text-muted-foreground">Room total:</span> {booking.room_total_usd ? formatCurrency(booking.room_total_usd) : "—"}</p>
            <p><span className="text-muted-foreground">Board plan:</span> {booking.board_plan ? BOARD_LABEL(booking.board_plan) : "—"}{Number(booking.board_total_usd) > 0 ? ` (${formatCurrency(Number(booking.board_total_usd))})` : ""}</p>
          </CardContent>
        </Card>
      </div>

      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent><p className="text-sm">{booking.notes}</p></CardContent>
        </Card>
      )}

      {(booking.status === "pending_payment" || booking.status === "confirmed") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Deposit
              {isDepositMet && <Badge variant="default">Met</Badge>}
            </CardTitle>
            {!isDepositMet && (
              <Button size="sm" onClick={() => { setDepositAmount(""); setShowDepositDialog(true) }}>Mark Received</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Required ({minDepositPct}%)</span><span>{formatCurrency(depositDue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span>{formatCurrency(depositReceived)}</span></div>
            {!isDepositMet && <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className="text-destructive">{formatCurrency(depositRemaining)}</span></div>}
            {depositDue > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (depositReceived / depositDue) * 100)}%` }} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">{renderActions()}</div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges</CardTitle>
          {booking.status === "checked_in" && !showChargeForm && (
            <Button size="sm" onClick={() => setShowChargeForm(true)}>Add Charge</Button>
          )}
        </CardHeader>
        <CardContent>
          {showChargeForm && (
            <div className="mb-4">
              <ChargeForm bookingId={booking.id} onSuccess={(charge) => { setCharges([...charges, charge]); setShowChargeForm(false) }} onCancel={() => setShowChargeForm(false)} />
            </div>
          )}
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No charges yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="capitalize">{c.category.replace("_", " ")}</TableCell>
                    <TableCell>{c.quantity}</TableCell>
                    <TableCell>{formatCurrency(c.unit_price_usd)}</TableCell>
                    <TableCell>{formatCurrency(c.line_total_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invoice && (
        <InvoiceView invoice={invoice} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          {booking.status !== "checked_out" && (
            <Button size="sm" onClick={() => setShowPaymentDialog(true)}>Record Payment</Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatCurrency(p.amount_usd)}</TableCell>
                    <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                    <TableCell>{p.paid_at ? format(new Date(p.paid_at), "PPp") : "—"}</TableCell>
                    <TableCell>
                      {p.method === "card_payhere" && p.status === "completed" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionLoading !== null}
                          onClick={async () => {
                            setActionLoading("refund")
                            try {
                              const { error } = await refundBookingPayment(booking.id)
                              if (error) throw new Error(error)
                              toast.success("Payment refunded via PayHere")
                              router.refresh()
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Refund failed")
                            } finally {
                              setActionLoading(null)
                            }
                          }}
                        >
                          {actionLoading === "refund" ? "Refunding..." : "Refund"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showMoveRoomDialog} onOpenChange={setShowMoveRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current room: <strong>{booking.rooms.room_number}</strong> ({booking.rooms.room_categories.name})
            </p>
            {loadingRooms ? (
              <p className="text-sm text-muted-foreground">Loading available rooms...</p>
            ) : availableRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available rooms for these dates</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                      selectedRoomId === r.id
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {r.room_number} — {r.room_categories.name}
                  </button>
                ))}
              </div>
            )}
            <Button
              onClick={async () => {
                if (!selectedRoomId) { toast.error("Select a room"); return }
                setActionLoading("move")
                try {
                  const { error } = await moveGuestToRoom(booking.id, selectedRoomId)
                  if (error) throw new Error(error)
                  toast.success("Room changed")
                  setShowMoveRoomDialog(false)
                  router.refresh()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to move")
                } finally {
                  setActionLoading(null)
                }
              }}
              disabled={actionLoading !== null || !selectedRoomId}
              className="w-full"
            >
              {actionLoading === "move" ? "Moving..." : "Confirm Move"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deposit required: {formatCurrency(depositDue)} &middot; Received so far: {formatCurrency(depositReceived)}
            </p>
            <div className="space-y-1">
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" />
            </div>
            <Button
              onClick={async () => {
                const amount = parseFloat(depositAmount)
                if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return }
                setActionLoading("deposit")
                try {
                  const { error } = await recordDeposit(booking.id, amount)
                  if (error) throw new Error(error)
                  toast.success("Deposit recorded")
                  setShowDepositDialog(false)
                  router.refresh()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed")
                } finally {
                  setActionLoading(null)
                }
              }}
              disabled={actionLoading !== null}
              className="w-full"
            >
              {actionLoading === "deposit" ? "Recording..." : "Record Deposit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <div className="flex gap-2">
                {(["cash", "bank_transfer", "card_payhere"] as const).map((m) => (
                  <Button key={m} variant={paymentMethod === m ? "default" : "outline"} size="sm" onClick={() => setPaymentMethod(m)} className="capitalize">
                    {m.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleRecordPayment} disabled={actionLoading !== null} className="w-full">
              {actionLoading === "payment" ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {printInvoice && (
            <div className="p-6">
              <div className="text-center space-y-1 mb-6">
                <h2 className="text-xl font-bold">Le Palme Ahangama</h2>
                <p className="text-xs text-muted-foreground">Invoice</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 my-5 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Guest</p>
                  <p className="font-medium">{booking.guests?.full_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Room</p>
                  <p className="font-medium">{booking.rooms.room_number} — {booking.rooms.room_categories.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Check-in</p>
                  <p className="font-medium">{format(new Date(booking.check_in), "PP")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Check-out</p>
                  <p className="font-medium">{format(new Date(booking.check_out), "PP")}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 my-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room charges</span>
                  <span>{formatCurrency(printInvoice.room_charges_total_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-on charges</span>
                  <span>{formatCurrency(printInvoice.addon_charges_total_usd)}</span>
                </div>
                {printInvoice.surcharge_pct_applied > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surcharge ({printInvoice.surcharge_pct_applied}%)</span>
                    <span>{formatCurrency((printInvoice.room_charges_total_usd + printInvoice.addon_charges_total_usd) * printInvoice.surcharge_pct_applied / 100)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold mt-5">
                <span>Grand Total</span>
                <span>{formatCurrency(printInvoice.grand_total_usd)}</span>
              </div>

              {printInvoice.issued_at && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  Issued {format(new Date(printInvoice.issued_at), "PPp")}
                </p>
              )}

              <div className="flex gap-2 mt-8">
                <Button onClick={handlePrintInvoice} className="flex-1">
                  Print Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
