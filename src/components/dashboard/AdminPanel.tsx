"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { SaveIcon, PlusIcon, Trash2Icon, CheckCircle2Icon, HomeIcon, MailIcon, PencilIcon, EyeIcon, ReplyIcon, RotateCcwIcon } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"
import { pricingUpdateSchema, settingsSchema, addUnitSchema, roomCategorySchema } from "@/lib/validations"
import { createRoomCategory, updateRoomCategory, deleteContactMessage } from "@/lib/actions/admin"
import { updateMaintenanceStatus } from "@/lib/actions/maintenance"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type RoomCategory = Database["public"]["Tables"]["room_categories"]["Row"]
type EquipmentCategory = Database["public"]["Tables"]["equipment_categories"]["Row"]
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
  equipmentCategories,
  settings: initialSettings,
  rooms: initialRooms,
  units: initialUnits,
  maintenance: initialMaintenance,
  contactMessages: initialContactMessages,
}: {
  profiles: Profile[]
  categories: RoomCategory[]
  equipmentCategories: EquipmentCategory[]
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

  const router = useRouter()

  // ad02: category add/edit dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [catName, setCatName] = useState("")
  const [catDescription, setCatDescription] = useState("")
  const [catMaxOccupancy, setCatMaxOccupancy] = useState("2")
  const [catBasePrice, setCatBasePrice] = useState("")
  const [catImageUrl, setCatImageUrl] = useState("")
  const [categorySaving, setCategorySaving] = useState(false)

  // ad05: maintenance status filter
  const [maintenanceFilter, setMaintenanceFilter] = useState("all")

  // ad06: contact message view + delete confirm
  const [viewMessageId, setViewMessageId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [messageDeleting, setMessageDeleting] = useState(false)

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

  // ad02: lightweight category management via server actions
  function openCategoryDialog(category?: RoomCategory) {
    setEditingCategoryId(category?.id ?? null)
    setCatName(category?.name ?? "")
    setCatDescription(category?.description ?? "")
    setCatMaxOccupancy(String(category?.max_occupancy ?? 2))
    setCatBasePrice(category ? String(category.base_price_usd) : "")
    setCatImageUrl(category?.image_url ?? "")
    setCategoryDialogOpen(true)
  }

  async function saveCategoryDialog() {
    if (!catBasePrice.trim() || Number.isNaN(Number(catBasePrice))) {
      toast.error("Enter a valid base price"); return
    }
    if (Number.isNaN(Number(catMaxOccupancy))) {
      toast.error("Enter a valid max occupancy"); return
    }
    const parsed = roomCategorySchema.safeParse({
      name: catName.trim(),
      description: catDescription.trim(),
      maxOccupancy: Number(catMaxOccupancy),
      basePriceUsd: Number(catBasePrice),
      imageUrl: catImageUrl.trim(),
    })
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return }
    setCategorySaving(true)
    const res = editingCategoryId
      ? await updateRoomCategory(editingCategoryId, parsed.data)
      : await createRoomCategory(parsed.data)
    setCategorySaving(false)
    if ("error" in res) { toast.error(res.error); return }
    if (editingCategoryId) {
      const updated = res.data
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setEditPrices((prev) => ({ ...prev, [updated.id]: updated.base_price_usd }))
      toast.success("Category updated")
    } else {
      setCategories((prev) => [...prev, res.data])
      setEditPrices((prev) => ({ ...prev, [res.data.id]: res.data.base_price_usd }))
      toast.success("Category added")
    }
    setCategoryDialogOpen(false)
    router.refresh()
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
    if (!equipmentCategories.some((c) => c.id === newUnitCategory)) {
      toast.error("Select an equipment category"); return
    }
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
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, condition_status: "retired" } : u)))
    toast.success("Unit retired")
  }

  async function restoreUnit(id: string) {
    const { error } = await supabase.from("equipment_units").update({ condition_status: "good" }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, condition_status: "good" } : u)))
    toast.success("Unit restored")
  }

  // Room management
  const [newRoomNumber, setNewRoomNumber] = useState("")
  const [newRoomCategory, setNewRoomCategory] = useState("")

  async function addRoom() {
    const roomNumber = newRoomNumber.trim()
    if (!roomNumber) { toast.error("Room number is required"); return }
    if (!newRoomCategory) { toast.error("Category is required"); return }
    // N9: catch duplicates against the already-loaded list before hitting the DB
    if (rooms.some((r) => r.room_number.toLowerCase() === roomNumber.toLowerCase())) {
      toast.error(`Room number ${roomNumber} already exists.`)
      return
    }
    const { data, error } = await supabase.from("rooms").insert({
      room_number: roomNumber,
      category_id: newRoomCategory,
    }).select("*, category:room_categories(*)").single()
    if (error) {
      // Map the raw unique-constraint failure to a friendly message
      if (error.message.includes("rooms_room_number_key")) {
        toast.error(`Room number ${roomNumber} already exists.`)
      } else {
        toast.error(error.message)
      }
      return
    }
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
    toast.success(read ? "Marked as read" : "Marked as unread")
  }

  async function deleteMessage(id: string) {
    setMessageDeleting(true)
    const res = await deleteContactMessage(id)
    setMessageDeleting(false)
    if ("error" in res) { toast.error(res.error); return }
    setContactMessages((prev) => prev.filter((m) => m.id !== id))
    setViewMessageId(null)
    setConfirmingDeleteId(null)
    toast.success("Message deleted")
    router.refresh()
  }

  // ad05: maintenance status workflow through the server action
  async function setMaintenanceStatus(
    id: string,
    status: "open" | "in_progress" | "resolved" | "closed",
    successMessage: string
  ) {
    const res = await updateMaintenanceStatus(id, status)
    if ("error" in res) { toast.error(res.error); return }
    setMaintenance((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
    toast.success(successMessage)
    router.refresh()
  }

  const maintenanceFilters = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ]
  const filteredMaintenance = maintenanceFilter === "all"
    ? maintenance
    : maintenance.filter((m) => m.status === maintenanceFilter)
  const viewedMessage = contactMessages.find((m) => m.id === viewMessageId) ?? null

  return (
    <div className="space-y-6">
      {/* 1. Staff Accounts */}
      <Card>
        <CardHeader><CardTitle>Staff Accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">Joined</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || p.role.charAt(0).toUpperCase() + p.role.slice(1)}</TableCell>
                  <TableCell className="capitalize">{p.role}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</TableCell>
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
                    aria-label={`Base price for ${c.name}`}
                    value={editPrices[c.id] ?? c.base_price_usd}
                    onChange={(e) => setEditPrices({ ...editPrices, [c.id]: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-sm text-muted-foreground">/ night</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => openCategoryDialog(c)}
                >
                  <PencilIcon />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={savePricing}><SaveIcon /> Save Pricing</Button>
          <Button variant="outline" onClick={() => openCategoryDialog()}><PlusIcon /> Add Category</Button>
        </CardFooter>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategoryId ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="category-name">Name</Label>
                <Input id="category-name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category-description">Description</Label>
                <Textarea id="category-description" rows={3} value={catDescription} onChange={(e) => setCatDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="category-occupancy">Max occupancy</Label>
                  <Input id="category-occupancy" type="number" min={1} max={20} value={catMaxOccupancy} onChange={(e) => setCatMaxOccupancy(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category-price">Base price (USD)</Label>
                  <Input id="category-price" type="number" step="0.01" min={0} value={catBasePrice} onChange={(e) => setCatBasePrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="category-image">Image URL</Label>
                <Input id="category-image" type="url" placeholder="https://..." value={catImageUrl} onChange={(e) => setCatImageUrl(e.target.value)} />
              </div>
              {editingCategoryId && (
                <p className="text-xs text-muted-foreground">Renaming changes the public room URL.</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveCategoryDialog} disabled={categorySaving}>
                  {categorySaving ? "Saving..." : editingCategoryId ? "Save Changes" : "Add Category"}
                </Button>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                <TableHead scope="col">Room</TableHead>
                <TableHead scope="col">Category</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="w-28">Actions</TableHead>
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
            aria-label="Room number"
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="w-40"
          />
          <Select value={newRoomCategory} onValueChange={(v) => setNewRoomCategory(v ?? "")} items={categories.map((c) => ({ value: c.id, label: c.name }))}>
            <SelectTrigger className="w-48" aria-label="Room category"><SelectValue placeholder="Category" /></SelectTrigger>
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
              <Label htmlFor="check-in-time">Check-in Time</Label>
              <Input id="check-in-time" type="time" value={settings.check_in_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, check_in_time: e.target.value + ":00" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out-time">Check-out Time</Label>
              <Input id="check-out-time" type="time" value={settings.check_out_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, check_out_time: e.target.value + ":00" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surcharge-pct">Surcharge %</Label>
              <Input id="surcharge-pct" type="number" step="0.1" value={settings.surcharge_pct} onChange={(e) => setSettings({ ...settings, surcharge_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-deposit-pct">Min Deposit %</Label>
              <Input id="min-deposit-pct" type="number" step="1" value={settings.min_deposit_pct} onChange={(e) => setSettings({ ...settings, min_deposit_pct: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings}><SaveIcon /> Save Settings</Button>
        </CardFooter>
      </Card>

      {/* 5. Maintenance Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests</CardTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            {maintenanceFilters.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={maintenanceFilter === f.value ? "default" : "outline"}
                aria-pressed={maintenanceFilter === f.value}
                onClick={() => setMaintenanceFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Room</TableHead>
                <TableHead scope="col">Issue</TableHead>
                <TableHead scope="col">Priority</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Reported By</TableHead>
                <TableHead scope="col">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaintenance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    {maintenance.length === 0 ? "No maintenance requests" : "No matching requests"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.rooms?.room_number ?? "?"}</TableCell>
                    <TableCell className="max-w-48 truncate">{m.description}</TableCell>
                    <TableCell>
                      <Badge variant={m.priority === "urgent" ? "destructive" : m.priority === "high" ? "default" : "secondary"}>
                        {m.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={m.status === "open" ? "destructive" : m.status === "resolved" ? "default" : "secondary"}>{m.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {m.status === "open" && (
                          <Button size="xs" variant="outline" onClick={() => setMaintenanceStatus(m.id, "in_progress", "Marked in progress")}>
                            Start
                          </Button>
                        )}
                        {(m.status === "open" || m.status === "in_progress") && (
                          <Button size="xs" variant="outline" onClick={() => setMaintenanceStatus(m.id, "resolved", "Marked resolved")}>
                            <CheckCircle2Icon /> Resolve
                          </Button>
                        )}
                        {(m.status === "resolved" || m.status === "closed") && (
                          <Button size="xs" variant="outline" onClick={() => setMaintenanceStatus(m.id, "open", "Request reopened")}>
                            <RotateCcwIcon /> Reopen
                          </Button>
                        )}
                        {m.status === "resolved" && (
                          <Button size="xs" variant="outline" onClick={() => setMaintenanceStatus(m.id, "closed", "Marked closed")}>
                            Close
                          </Button>
                        )}
                      </div>
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
                <TableHead scope="col">Label</TableHead>
                <TableHead scope="col">Category</TableHead>
                <TableHead scope="col">Condition</TableHead>
                <TableHead scope="col" className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id} className={u.condition_status === "retired" ? "opacity-70" : ""}>
                  <TableCell className="font-medium">{u.unit_label}</TableCell>
                  <TableCell>{u.category?.name?.split(' — ')[0] ?? u.category?.name}</TableCell>
                  <TableCell>
                    <Badge variant={u.condition_status === "retired" ? "secondary" : u.condition_status === "good" ? "default" : "destructive"}>
                      {u.condition_status === "retired" ? "Retired" : u.condition_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.condition_status === "retired" ? (
                      <Button variant="outline" size="sm" aria-label={`Restore ${u.unit_label}`} onClick={() => restoreUnit(u.id)}>
                        <RotateCcwIcon /> Restore
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" aria-label={`Retire ${u.unit_label}`} onClick={() => retireUnit(u.id)}>
                        <Trash2Icon />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center gap-3">
          <Input placeholder="Unit label" aria-label="Unit label" value={newUnitLabel} onChange={(e) => setNewUnitLabel(e.target.value)} className="w-48" />
          <Select value={newUnitCategory} onValueChange={(v) => setNewUnitCategory(v ?? "")} items={equipmentCategories.map((c) => ({ value: c.id, label: c.name.split(' — ')[0] }))}>
            <SelectTrigger className="w-48" aria-label="Equipment category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {equipmentCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name.split(' — ')[0]}</SelectItem>
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
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Message</TableHead>
                <TableHead scope="col" className="w-24">Status</TableHead>
                <TableHead scope="col" className="w-48">Actions</TableHead>
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
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`View message from ${m.name}`}
                          onClick={() => setViewMessageId(m.id)}
                        >
                          <EyeIcon /> View
                        </Button>
                        <Button
                          variant={m.read ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleMessageRead(m.id, !m.read)}
                        >
                          {m.read ? "Mark unread" : "Mark read"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ad06: full message view / reply / delete */}
      <Dialog
        open={!!viewedMessage}
        onOpenChange={(open) => {
          if (!open) {
            setViewMessageId(null)
            setConfirmingDeleteId(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {viewedMessage && (
            <>
              <DialogHeader>
                <DialogTitle>Message from {viewedMessage.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{viewedMessage.email}</span>
                  <span>·</span>
                  <span>
                    {viewedMessage.created_at ? new Date(viewedMessage.created_at).toLocaleString() : "—"}
                  </span>
                  <Badge variant={viewedMessage.read ? "secondary" : "default"}>
                    {viewedMessage.read ? "Read" : "New"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{viewedMessage.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button render={<a href={`mailto:${viewedMessage.email}?subject=${encodeURIComponent("Re: your enquiry")}`} />}>
                    <ReplyIcon /> Reply
                  </Button>
                  <Button variant="outline" onClick={() => toggleMessageRead(viewedMessage.id, !viewedMessage.read)}>
                    {viewedMessage.read ? "Mark unread" : "Mark read"}
                  </Button>
                  {confirmingDeleteId === viewedMessage.id ? (
                    <>
                      <Button variant="destructive" disabled={messageDeleting} onClick={() => deleteMessage(viewedMessage.id)}>
                        {messageDeleting ? "Deleting..." : "Yes, delete"}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmingDeleteId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button variant="destructive" onClick={() => setConfirmingDeleteId(viewedMessage.id)}>
                      <Trash2Icon /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
