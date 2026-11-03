import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RoomStatus = {
  id: string
  room_number: string
  housekeeping_status: "dirty" | "cleaning" | "ready"
  operational_status: "active" | "retired"
  room_categories: { name: string }
  current_booking?: {
    id: string
    guest_name: string | null
    status: string
    check_in: string
    check_out: string
  } | null
}

const roomBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Retired: "outline",
  Dirty: "destructive",
  Cleaning: "secondary",
  Vacant: "outline",
  Occupied: "default",
  Arriving: "default",
  Departing: "secondary",
  Booked: "secondary",
}

function getStatusInfo(r: RoomStatus) {
  if (r.operational_status === "retired") return { label: "Retired" }
  const b = r.current_booking
  if (!b) {
    if (r.housekeeping_status === "dirty") return { label: "Dirty" }
    if (r.housekeeping_status === "cleaning") return { label: "Cleaning" }
    return { label: "Vacant" }
  }
  if (b.status === "checked_in") return { label: "Occupied" }
  const today = new Date().toISOString().split("T")[0]
  if (b.check_in === today) return { label: "Arriving" }
  if (b.check_out === today) return { label: "Departing" }
  return { label: "Booked" }
}

export function RoomStatusBoard({ rooms }: { rooms: RoomStatus[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Room Status</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {rooms.map((r) => {
          const info = getStatusInfo(r)
          return (
            <Link
              key={r.id}
              href={r.current_booking ? `/dashboard/bookings/${r.current_booking.id}` : "/dashboard/calendar"}
              className="block rounded-xl cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Card className={cn(r.operational_status === "retired" && "opacity-50", "transition-opacity hover:opacity-80")}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.room_number}</span>
                    <Badge variant={roomBadgeVariant[info.label] ?? "outline"} className="text-[11px] px-1.5 py-0 h-5 font-normal">
                      {info.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.room_categories.name}</p>
                  {r.current_booking?.guest_name && (
                    <p className="text-xs truncate text-muted-foreground">{r.current_booking.guest_name}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
