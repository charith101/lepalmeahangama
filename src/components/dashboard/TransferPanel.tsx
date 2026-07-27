"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { PlusIcon, PlaneLandingIcon, PlaneTakeoffIcon, CheckIcon, XIcon } from "lucide-react"
import { transferSchema } from "@/lib/validations"

interface Guest {
  id: string; full_name: string; email: string | null; phone: string | null
}

interface Route {
  id: string; airport_name: string; fixed_price_usd: number; estimated_duration_mins: number | null
}

interface Transfer {
  id: string; route_id: string; guest_id: string; booking_id: string | null
  direction: "arrival" | "departure"; flight_number: string | null
  transfer_datetime: string; price_usd: number | null; status: "scheduled" | "completed" | "cancelled"; notes: string | null
  guest: Guest; route: Route
}

export function TransferPanel({
  transfers, routes, guests,
}: {
  transfers: Transfer[]; routes: Route[]; guests: Guest[]
}) {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const [filterDate, setFilterDate] = useState(today)
  const [items, setItems] = useState(transfers)
  const [open, setOpen] = useState(false)
  const [newTransfer, setNewTransfer] = useState({
    routeId: "", guestId: "", direction: "arrival" as "arrival" | "departure",
    flightNumber: "", datetime: "",
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const filtered = items.filter((t) => t.transfer_datetime.startsWith(filterDate))

  function updateField(field: string, value: string) {
    setNewTransfer((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  async function handleCreate() {
    const result = transferSchema.safeParse(newTransfer)
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] && !errs[String(issue.path[0])]) {
          errs[String(issue.path[0])] = issue.message
        }
      }
      setFieldErrors(errs)
      return
    }
    const route = routes.find((r) => r.id === result.data.routeId)
    const { data, error } = await supabase.from("airport_transfers").insert({
      route_id: result.data.routeId,
      guest_id: result.data.guestId,
      direction: result.data.direction,
      flight_number: result.data.flightNumber || null,
      transfer_datetime: result.data.datetime,
      price_usd: route?.fixed_price_usd ?? null,
      status: "scheduled",
    }).select("*, guest:guests(*), route:airport_transfer_routes(*)").single()

    if (error) { toast.error(error.message); return }
    setItems((prev) => [data, ...prev])
    setOpen(false)
    setNewTransfer({ routeId: "", guestId: "", direction: "arrival", flightNumber: "", datetime: "" })
    setFieldErrors({})
    toast.success("Transfer created")
  }

  async function handleStatus(id: string, status: "completed" | "cancelled") {
    const { error } = await supabase.from("airport_transfers").update({ status }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } as Transfer : t)))
    toast.success(`Transfer ${status}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Date</Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-fit" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><PlusIcon /> New Transfer</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>New Airport Transfer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={newTransfer.routeId} onValueChange={(v) => updateField("routeId", v ?? "")}>
                  <SelectTrigger className="w-full" data-invalid={!!fieldErrors.routeId || undefined}><SelectValue placeholder="Select route" /></SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.airport_name} (${r.fixed_price_usd})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.routeId && <p className="text-sm text-destructive" role="alert">{fieldErrors.routeId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Guest</Label>
                <Select value={newTransfer.guestId} onValueChange={(v) => updateField("guestId", v ?? "")}>
                  <SelectTrigger className="w-full" data-invalid={!!fieldErrors.guestId || undefined}><SelectValue placeholder="Select guest" /></SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.guestId && <p className="text-sm text-destructive" role="alert">{fieldErrors.guestId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={newTransfer.direction} onValueChange={(v) => updateField("direction", (v ?? "arrival"))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arrival">Arrival (Airport → Hotel)</SelectItem>
                    <SelectItem value="departure">Departure (Hotel → Airport)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Flight Number</Label>
                <Input value={newTransfer.flightNumber} onChange={(e) => updateField("flightNumber", e.target.value)} placeholder="e.g. UL-101" />
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={newTransfer.datetime} onChange={(e) => updateField("datetime", e.target.value)} aria-invalid={!!fieldErrors.datetime} />
                {fieldErrors.datetime && <p className="text-sm text-destructive" role="alert">{fieldErrors.datetime}</p>}
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Transfer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Transfers for {filterDate}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Flight</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.guest?.full_name}</TableCell>
                  <TableCell>
                    {t.direction === "arrival" ? (
                      <span className="flex items-center gap-1"><PlaneLandingIcon className="size-4" /> Arrival</span>
                    ) : (
                      <span className="flex items-center gap-1"><PlaneTakeoffIcon className="size-4" /> Departure</span>
                    )}
                  </TableCell>
                  <TableCell>{t.flight_number ?? "—"}</TableCell>
                  <TableCell>{new Date(t.transfer_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>{t.route?.airport_name}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "scheduled" ? "outline" : t.status === "completed" ? "default" : "destructive"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.status === "scheduled" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleStatus(t.id, "completed")}>
                            <CheckIcon /> Done
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleStatus(t.id, "cancelled")}>
                            <XIcon />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transfers for this date.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
