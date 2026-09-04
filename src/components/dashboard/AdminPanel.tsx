"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { SaveIcon, PlusIcon, Trash2Icon, CheckCircle2Icon, HomeIcon, MailIcon } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"
import { pricingUpdateSchema, settingsSchema, addUnitSchema } from "@/lib/validations"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type RoomCategory = Database["public"]["Tables"]["room_categories"]["Row"]
type Settings = Database["public"]["Tables"]["settings"]["Row"]
type Room = Database["public"]["Tables"]["rooms"]["Row"] & { category: RoomCategory | null }
type EquipmentUnit = Database["public"]["Tables"]["equipment_units"]["Row"] & { category: Database["public"]["Tables"]["equipment_categories"]["Row"] | null }
type MaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"] & {
  rooms: { room_number: string; room_categories: { name: string } | null } | null
  profiles: { full_name: string | null } | null
}
type ContactMessage = Database["public"]["Tables"]["contact_messages"]["Row"]

export function AdminPanel({
  profiles: initialProfiles,
  categories: initialCategories,
  settings: initialSettings,
  rooms: initialRooms,
  units: initialUnits,
  maintenance: initialMaintenance,
  contactMessages: initialContactMessages,
}: {
  profiles: Profile[]
  categories: RoomCategory[]
  settings: Settings
  rooms: Room[]
  units: EquipmentUnit[]
  maintenance: MaintenanceRequest[]
  contactMessages: ContactMessage[]
}) {
  const supabase = createClient()

  const [profiles, setProfiles] = useState(initialProfiles)
  const [categories, setCategories] = useState(initialCategories)
  const [settings, setSettings] = useState(initialSettings)
  const [rooms, setRooms] = useState(initialRooms)
  const [units, setUnits] = useState(initialUnits)
  const [maintenance, setMaintenance] = useState(initialMaintenance)
  const [contactMessages, setContactMessages] = useState(initialContactMessages)

  const [editPrices, setEditPrices] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((c) => [c.id, c.base_price_usd]))
  )

  async function toggleProfileActive(id: string, active: boolean) {
    const { error } = await supabase.from("profiles").update({ active }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)))
    toast.success(active ? "Staff activated" : "Staff deactivated")
  }

  async function savePricing() {
    for (const [id, price] of Object.entries(editPrices)) {
      const result = pricingUpdateSchema.safeParse({ basePriceUsd: price })
      if (!result.success) {
        const cat = categories.find((c) => c.id === id)
        toast.error(`${cat?.name ?? "Category"}: ${result.error.issues[0].message}`)
        return
      }
      await supabase.from("room_categories").update({ base_price_usd: price }).eq("id", id)
    }
    setCategories((prev) => prev.map((c) => ({ ...c, base_price_usd: editPrices[c.id] ?? c.base_price_usd })))
    toast.success("Prices updated")
  }

  async function saveSettings() {
    const result = settingsSchema.safeParse({
      checkInTime: settings.check_in_time,
      checkOutTime: settings.check_out_time,
      surchargePct: settings.surcharge_pct,
      minDepositPct: settings.min_deposit_pct,
    })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }
    const { error } = await supabase.from("settings").update({
      check_in_time: settings.check_in_time,
      check_out_time: settings.check_out_time,
      surcharge_pct: settings.surcharge_pct,
      min_deposit_pct: settings.min_deposit_pct,
    }).eq("id", true)
    if (error) { toast.error(error.message); return }
    toast.success("Settings saved")
  }

  async function toggleRoomStatus(id: string, operational_status: "active" | "retired") {
    const { error } = await supabase.from("rooms").update({ operational_status }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, operational_status } : r)))
    toast.success(`Room ${operational_status}`)
  }

  const [newUnitLabel, setNewUnitLabel] = useState("")
  const [newUnitCategory, setNewUnitCategory] = useState("")

  async function addUnit() {
    const result = addUnitSchema.safeParse({ unitLabel: newUnitLabel, categoryId: newUnitCategory })
    if (!result.success) { toast.error(result.error.issues[0].message); return }
    const { data, error } = await supabase.from("equipment_units").insert({
      unit_label: newUnitLabel,
      category_id: newUnitCategory,
      condition_status: "good",
    }).select("*, category:equipment_categories(*)").single()
    if (error) { toast.error(error.message); return }
    setUnits((prev) => [...prev, data])
    setNewUnitLabel("")
    setNewUnitCategory("")
    toast.success("Unit added")
  }

  async function retireUnit(id: string) {
    const { error } = await supabase.from("equipment_units").update({ condition_status: "retired" }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setUnits((prev) => prev.filter((u) => u.id !== id))
    toast.success("Unit retired")
  }

  // Room management
  const [newRoomNumber, setNewRoomNumber] = useState("")
  const [newRoomCategory, setNewRoomCategory] = useState("")

  async function addRoom() {
    if (!newRoomNumber.trim()) { toast.error("Room number is required"); return }
    if (!newRoomCategory) { toast.error("Category is required"); return }
    const { data, error } = await supabase.from("rooms").insert({
      room_number: newRoomNumber.trim(),
      category_id: newRoomCategory,
    }).select("*, category:room_categories(*)").single()
    if (error) { toast.error(error.message); return }
    setRooms((prev) => [...prev, data])
    setNewRoomNumber("")
    setNewRoomCategory("")
    toast.success("Room added")
  }

  // Contact messages
  async function toggleMessageRead(id: string, read: boolean) {
    const { error } = await supabase.from("contact_messages").update({ read }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setContactMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read } : m)))
  }

  return (
    <div className="space-y-6">
      {/* 1. Staff Accounts */}
      <Card>
        <CardHeader><CardTitle>Staff Accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || p.role.charAt(0).toUpperCase() + p.role.slice(1)}</TableCell>
                  <TableCell className="capitalize">{p.role}</TableCell>
                  <TableCell><Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>
                    {p.active ? (
                      <Button variant="destructive" size="sm" onClick={() => toggleProfileActive(p.id, false)}>Deactivate</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => toggleProfileActive(p.id, true)}>Activate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. Room Categories — Pricing */}
      <Card>
        <CardHeader><CardTitle>Room Categories — Pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-4">
                <span className="w-32 font-medium">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-28"
                    value={editPrices[c.id] ?? c.base_price_usd}
                    onChange={(e) => setEditPrices({ ...editPrices, [c.id]: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-sm text-muted-foreground">/ night</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={savePricing}><SaveIcon /> Save Pricing</Button>
        </CardFooter>
      </Card>

      {/* 3. Room Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HomeIcon className="size-4" />
            Rooms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.room_number}</TableCell>
                  <TableCell>{r.category?.name}</TableCell>
                  <TableCell><Badge variant={r.operational_status === "active" ? "default" : "secondary"}>{r.operational_status}</Badge></TableCell>
                  <TableCell>
                    <Button
                      variant={r.operational_status === "active" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => toggleRoomStatus(r.id, r.operational_status === "active" ? "retired" : "active")}
                    >
                      {r.operational_status === "active" ? "Retire" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center gap-3">
          <Input
            placeholder="Room number"
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="w-40"
          />
          <Select value={newRoomCategory} onValueChange={(v) => setNewRoomCategory(v ?? "")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addRoom}><PlusIcon /> Add Room</Button>
        </CardFooter>
      </Card>

      {/* 4. Hotel Settings */}
      <Card>
        <CardHeader><CardTitle>Hotel Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Time</Label>
              <Input type="time" value={settings.check_in_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, check_in_time: e.target.value + ":00" })} />
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input type="time" value={settings.check_out_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, check_out_time: e.target.value + ":00" })} />
            </div>
            <div className="space-y-2">
              <Label>Surcharge %</Label>
              <Input type="number" step="0.1" value={settings.surcharge_pct} onChange={(e) => setSettings({ ...settings, surcharge_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Min Deposit %</Label>
              <Input type="number" step="1" value={settings.min_deposit_pct} onChange={(e) => setSettings({ ...settings, min_deposit_pct: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings}><SaveIcon /> Save Settings</Button>
        </CardFooter>
      </Card>

      {/* 5. Maintenance Requests */}
      <Card>
        <CardHeader><CardTitle>Maintenance Requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No maintenance requests</TableCell>
                </TableRow>
              ) : (
                maintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.rooms?.room_number ?? "?"}</TableCell>
                    <TableCell className="max-w-48 truncate">{m.description}</TableCell>
                    <TableCell>
                      <Badge variant={m.priority === "urgent" ? "destructive" : m.priority === "high" ? "default" : "secondary"}>
                        {m.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={m.status === "open" ? "destructive" : m.status === "resolved" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      {m.status !== "resolved" && m.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const supabase = createClient()
                            const { error } = await supabase.from("maintenance_requests")
                              .update({ status: "resolved", resolved_at: new Date().toISOString() })
                              .eq("id", m.id)
                            if (error) { toast.error(error.message); return }
                            setMaintenance((prev) => prev.map((r) => r.id === m.id ? { ...r, status: "resolved" as const, resolved_at: new Date().toISOString() } : r))
                            toast.success("Marked resolved")
                          }}
                        >
                          <CheckCircle2Icon /> Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 6. Equipment Units */}
      <Card>
        <CardHeader><CardTitle>Equipment Units</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.unit_label}</TableCell>
                  <TableCell>{u.category?.name?.split(' — ')[0] ?? u.category?.name}</TableCell>
                  <TableCell><Badge variant={u.condition_status === "good" ? "default" : "destructive"}>{u.condition_status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => retireUnit(u.id)}><Trash2Icon /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center gap-3">
          <Input placeholder="Unit label" value={newUnitLabel} onChange={(e) => setNewUnitLabel(e.target.value)} className="w-48" />
          <Select value={newUnitCategory} onValueChange={(v) => setNewUnitCategory(v ?? "")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addUnit}><PlusIcon /> Add Unit</Button>
        </CardFooter>
      </Card>

      {/* 7. Contact Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="size-4" />
            Contact Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No messages yet</TableCell>
                </TableRow>
              ) : (
                contactMessages.map((m) => (
                  <TableRow key={m.id} className={!m.read ? "bg-muted/30" : ""}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                      {m.message}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.read ? "secondary" : "default"}>
                        {m.read ? "Read" : "New"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={m.read ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleMessageRead(m.id, !m.read)}
                      >
                        {m.read ? "Mark unread" : "Mark read"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
