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
import { PlusIcon, RotateCcwIcon } from "lucide-react"
import { equipmentRentalSchema } from "@/lib/validations"

interface Guest {
  id: string; full_name: string; nic_or_passport: string | null; nationality: string | null; email: string | null; phone: string | null
}

interface EquipmentCategory {
  id: string; name: string; price_per_day_usd: number
}

interface EquipmentUnit {
  id: string; unit_label: string; condition_status: string; category: EquipmentCategory
}

interface EquipmentBooking {
  id: string; unit_id: string; guest_id: string; start_date: string; end_date: string; price_usd: number | null; status: string
  guest: Guest; unit: EquipmentUnit
}

export function EquipmentPanel({
  bookings, categories, units, guests,
}: {
  bookings: EquipmentBooking[]; categories: EquipmentCategory[]; units: EquipmentUnit[]; guests: Guest[]
}) {
  const supabase = createClient()
  const [activeBookings, setActiveBookings] = useState(bookings)
  const [open, setOpen] = useState(false)
  const [newRental, setNewRental] = useState({ categoryId: "", unitId: "", guestId: "", startDate: "", endDate: "" })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const availableUnits = units.filter((u) => u.category.id === newRental.categoryId)

  function updateField(field: string, value: string) {
    setNewRental((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  async function handleCreateRental() {
    const result = equipmentRentalSchema.safeParse(newRental)
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
    const unit = units.find((u) => u.id === result.data.unitId)
    if (!unit) return
    const days = Math.max(1, Math.round((new Date(result.data.endDate).getTime() - new Date(result.data.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    const price = days * unit.category.price_per_day_usd

    const { data, error } = await supabase.from("equipment_bookings").insert({
      unit_id: result.data.unitId,
      guest_id: result.data.guestId,
      start_date: result.data.startDate,
      end_date: result.data.endDate,
      price_usd: price,
      status: "active",
    }).select("*, guest:guests(*), unit:equipment_units(*, category:equipment_categories(*))").single()

    if (error) { toast.error(error.message); return }
    setActiveBookings((prev) => [data, ...prev])
    setOpen(false)
    setNewRental({ categoryId: "", unitId: "", guestId: "", startDate: "", endDate: "" })
    setFieldErrors({})
    toast.success("Rental created")
  }

  async function handleReturn(id: string) {
    const { error } = await supabase.from("equipment_bookings").update({ status: "returned" }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setActiveBookings((prev) => prev.filter((b) => b.id !== id))
    toast.success("Equipment returned")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{activeBookings.length} active rental(s)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><PlusIcon /> New Rental</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>New Equipment Rental</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newRental.categoryId} onValueChange={(v) => { updateField("categoryId", v ?? ""); setNewRental((prev) => ({ ...prev, unitId: "" })) }}>
                  <SelectTrigger className="w-full" data-invalid={!!fieldErrors.categoryId || undefined}><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} (${c.price_per_day_usd}/day)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.categoryId && <p className="text-sm text-destructive" role="alert">{fieldErrors.categoryId}</p>}
              </div>
              {newRental.categoryId && (
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newRental.unitId} onValueChange={(v) => updateField("unitId", v ?? "")}>
                    <SelectTrigger className="w-full" data-invalid={!!fieldErrors.unitId || undefined}><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.unit_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.unitId && <p className="text-sm text-destructive" role="alert">{fieldErrors.unitId}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label>Guest</Label>
                <Select value={newRental.guestId} onValueChange={(v) => updateField("guestId", v ?? "")}>
                  <SelectTrigger className="w-full" data-invalid={!!fieldErrors.guestId || undefined}><SelectValue placeholder="Search guest" /></SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.full_name} {g.email ? `(${g.email})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.guestId && <p className="text-sm text-destructive" role="alert">{fieldErrors.guestId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={newRental.startDate} onChange={(e) => updateField("startDate", e.target.value)} aria-invalid={!!fieldErrors.startDate} />
                  {fieldErrors.startDate && <p className="text-sm text-destructive" role="alert">{fieldErrors.startDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={newRental.endDate} onChange={(e) => updateField("endDate", e.target.value)} aria-invalid={!!fieldErrors.endDate} />
                  {fieldErrors.endDate && <p className="text-sm text-destructive" role="alert">{fieldErrors.endDate}</p>}
                </div>
              </div>
              <Button className="w-full" onClick={handleCreateRental}>Create Rental</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Rentals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.guest?.full_name}</TableCell>
                  <TableCell>{b.unit?.unit_label}</TableCell>
                  <TableCell>{new Date(b.start_date).toLocaleDateString()} – {new Date(b.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>${(b.price_usd ?? 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                  <TableCell>
                    {b.status === "active" && (
                      <Button variant="outline" size="sm" onClick={() => handleReturn(b.id)}>
                        <RotateCcwIcon /> Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {activeBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No rentals.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
