import { createClient } from "@/lib/supabase/server"
import { HousekeepingCard } from "@/components/dashboard/HousekeepingCard"
import { Badge } from "@/components/ui/badge"

export default async function HousekeepingPage() {
  const supabase = await createClient()

  const [roomsRes, issuesRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("*, room_categories(name)")
      .eq("operational_status", "active")
      .order("room_number"),
    // RLS "staff_read_maintenance" allows any staff role to read maintenance requests
    supabase
      .from("maintenance_requests")
      .select("id, room_id, description, priority, rooms(room_number)")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
  ])

  const rooms = roomsRes.data ?? []
  const issues = issuesRes.data ?? []

  const issuesByRoom = new Map<string, typeof issues>()
  for (const issue of issues) {
    issuesByRoom.set(issue.room_id, [...(issuesByRoom.get(issue.room_id) ?? []), issue])
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Housekeeping</h1>
      {issues.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-2">Open issues</h2>
          <ul className="rounded-md border divide-y">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{issue.rooms?.room_number ?? "—"}</span>
                <span className="flex-1 truncate text-muted-foreground">{issue.description}</span>
                <Badge variant={issue.priority === "urgent" ? "destructive" : issue.priority === "high" ? "default" : "secondary"}>
                  {issue.priority}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {rooms.map((room) => (
          <HousekeepingCard
            key={room.id}
            roomId={room.id}
            roomNumber={room.room_number}
            categoryName={room.room_categories.name}
            status={room.housekeeping_status}
            issues={(issuesByRoom.get(room.id) ?? []).map(({ id, description, priority }) => ({ id, description, priority }))}
          />
        ))}
      </div>
    </div>
  )
}
