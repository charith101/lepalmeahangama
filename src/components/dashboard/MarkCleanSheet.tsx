"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

type DirtyRoom = {
  id: string
  room_number: string
  housekeeping_status: string
  room_categories: { name: string }
}

export function MarkCleanSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [rooms, setRooms] = useState<DirtyRoom[] | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    supabase
      .from("rooms")
      .select("id, room_number, housekeeping_status, room_categories(name)")
      .eq("operational_status", "active")
      .in("housekeeping_status", ["dirty", "cleaning"])
      .order("room_number")
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load rooms")
        else setRooms(data as unknown as DirtyRoom[])
      })
  }, [open, supabase])

  async function handleMarkClean() {
    if (!selectedId) { toast.error("Select a room"); return }
    setLoading(true)
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ housekeeping_status: "ready" })
        .eq("id", selectedId)
      if (error) throw error
      const room = rooms?.find((r) => r.id === selectedId)
      toast.success(`Room ${room?.room_number} marked ready`)
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { setRooms(null); setSelectedId("") } }}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Sparkles className="size-4" />
        Mark Room Clean
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Mark Room Clean</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")} disabled={rooms === null} items={(rooms ?? []).map((r) => ({ value: r.id, label: `${r.room_number} — ${r.room_categories.name}` }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={rooms === null ? "Loading..." : "Select room"} />
              </SelectTrigger>
              <SelectContent>
                {rooms === null ? (
                  <SelectItem value="_loading" disabled>Loading...</SelectItem>
                ) : rooms.length === 0 ? (
                  <SelectItem value="_empty" disabled>All rooms are clean</SelectItem>
                ) : (
                  rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.room_number} — {r.room_categories.name}
                      <Badge className="ml-2" variant="outline">{r.housekeeping_status}</Badge>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleMarkClean}
            disabled={loading || !selectedId || selectedId.startsWith("_")}
            className="w-full"
          >
            {loading ? "Updating..." : "Mark as Ready"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
