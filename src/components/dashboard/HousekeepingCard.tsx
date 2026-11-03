"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { updateRoomHousekeepingStatus } from "@/lib/actions/rooms"
import { reportMaintenanceIssue } from "@/lib/actions/maintenance"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  dirty: "destructive",
  cleaning: "secondary",
  ready: "default",
}

const NEXT_STATUS: Record<string, string | null> = {
  dirty: "cleaning",
  cleaning: "ready",
  ready: null,
}

type OpenIssue = { id: string; description: string; priority: string }

export function HousekeepingCard({ roomId, roomNumber, categoryName, status: initialStatus, issues = [] }: { roomId: string; roomNumber: string; categoryName: string; status: string; issues?: OpenIssue[] }) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [updating, setUpdating] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportDescription, setReportDescription] = useState("")
  const [reportPriority, setReportPriority] = useState("normal")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  async function handleUpdate(next: string) {
    setUpdating(true)
    try {
      const { error } = await updateRoomHousekeepingStatus(roomId, next as "dirty" | "cleaning" | "ready")
      if (error) throw new Error(error)
      setStatus(next)
      toast.success(`Room ${roomNumber} marked as ${next}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setUpdating(false)
    }
  }

  async function handleReportIssue() {
    if (!reportDescription.trim()) { toast.error("Describe the issue"); return }
    setReportSubmitting(true)
    try {
      const { error } = await reportMaintenanceIssue({
        roomId,
        description: reportDescription.trim(),
        priority: reportPriority as "low" | "normal" | "high" | "urgent",
      })
      if (error) throw new Error(error)
      toast.success("Maintenance issue reported")
      setShowReportDialog(false)
      setReportDescription("")
      setReportPriority("normal")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to report")
    } finally {
      setReportSubmitting(false)
    }
  }

  const next = NEXT_STATUS[status]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <span className="text-lg font-semibold">{roomNumber}</span>
        <Badge variant={statusVariant[status] ?? "outline"}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{categoryName}</p>
        <div className="flex gap-1.5">
          <Button size="xs" variant={status === "dirty" ? "default" : "outline"} onClick={() => handleUpdate("dirty")} disabled={updating || status === "dirty"}>Dirty</Button>
          <Button size="xs" variant={status === "cleaning" ? "default" : "outline"} onClick={() => handleUpdate("cleaning")} disabled={updating || (next !== "cleaning" && status !== "cleaning")}>Cleaning</Button>
          <Button size="xs" variant={status === "ready" ? "default" : "outline"} onClick={() => handleUpdate("ready")} disabled={updating || (next !== "ready" && status !== "ready")}>Ready</Button>
        </div>
        {issues.length > 0 && (
          <Badge variant={issues.some((i) => i.priority === "urgent" || i.priority === "high") ? "destructive" : "secondary"}>
            ⚠ {issues.length} open {issues.length === 1 ? "issue" : "issues"}
          </Badge>
        )}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogTrigger render={<Button size="xs" variant="outline" className="w-full gap-1" />}>
            <Wrench className="size-3" />
            Report Issue
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Issue — Room {roomNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="e.g. AC not cooling, broken light..." rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={reportPriority} onValueChange={(v) => v && setReportPriority(v)} items={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReportIssue} disabled={reportSubmitting || !reportDescription.trim()} className="flex-1">
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
