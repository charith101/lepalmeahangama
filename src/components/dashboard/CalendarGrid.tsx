"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { format, addDays, differenceInDays } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  pending_payment: "bg-secondary text-secondary-foreground",
  confirmed: "bg-primary/10 text-primary",
  checked_in: "bg-primary text-primary-foreground",
  checked_out: "bg-secondary/50 text-secondary-foreground",
  maintenance_block: "bg-muted text-muted-foreground",
  cancelled: "bg-muted/40 text-muted-foreground line-through",
  no_show: "bg-muted/60 text-muted-foreground border-dashed border-border",
}

const STATUS_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "pending_payment", label: "Pending payment" },
  { key: "confirmed", label: "Confirmed" },
  { key: "checked_in", label: "Checked in" },
  { key: "checked_out", label: "Checked out" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No show" },
  { key: "maintenance_block", label: "Maintenance" },
]

interface BookingRow {
  id: string
  check_in: string
  check_out: string
  status: string
  room_id: string
  guests: { full_name: string } | null
  rooms: {
    room_number: string
    category_id: string
    room_categories: {
      name: string
    }
  }
}

interface RoomRow {
  id: string
  room_number: string
  category_id: string
  room_categories: {
    name: string
  }
}

export function CalendarGrid({
  bookings,
  rooms,
  startDate,
}: {
  bookings: BookingRow[]
  rooms: RoomRow[]
  startDate: string
}) {
  const dates = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = new Date(startDate + "T00:00:00")
        return addDays(d, i)
      }),
    [startDate],
  )

  const [visible, setVisible] = useState<string[]>(STATUS_OPTIONS.map((s) => s.key))

  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, BookingRow[]>()
    for (const b of bookings) {
      const existing = map.get(b.room_id)
      if (existing) existing.push(b)
      else map.set(b.room_id, [b])
    }
    return map
  }, [bookings])

  const categories = useMemo(() => {
    const map = new Map<string, RoomRow[]>()
    for (const room of rooms) {
      const cat = room.room_categories?.name ?? "Other"
      const existing = map.get(cat)
      if (existing) existing.push(room)
      else map.set(cat, [room])
    }
    return map
  }, [rooms])

  const roomRows = useMemo(() => {
    const rows: Array<{ type: "category"; name: string } | { type: "room"; room: RoomRow }> = []
    for (const [catName, catRooms] of categories) {
      rows.push({ type: "category", name: catName })
      for (const room of catRooms) {
        rows.push({ type: "room", room })
      }
    }
    return rows
  }, [categories])

  function getDayIndex(dateStr: string) {
    return differenceInDays(new Date(dateStr + "T00:00:00"), new Date(startDate + "T00:00:00"))
  }

  const gridChildren: React.ReactNode[] = []

  const colCount = 1 + 30

  gridChildren.push(
    <div
      key="header-room"
      className="sticky left-0 z-20 bg-muted/50 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-r"
      style={{ gridColumn: 1, gridRow: 1 }}
    >
      Room
    </div>,
  )

  for (let i = 0; i < 30; i++) {
    gridChildren.push(
      <div
        key={`header-${i}`}
        className="flex items-center justify-center border-b border-r bg-muted/50 text-xs text-muted-foreground"
        style={{ gridColumn: i + 2, gridRow: 1 }}
      >
        {format(dates[i], "d")}
      </div>,
    )
  }

  let currentGridRow = 2
  for (const row of roomRows) {
    if (row.type === "category") {
      gridChildren.push(
        <div
          key={`cat-${row.name}`}
          className="flex items-center px-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-r"
          style={{ gridColumn: `1 / ${colCount + 1}`, gridRow: currentGridRow }}
        >
          {row.name}
        </div>,
      )
      currentGridRow++
      continue
    }

    const room = row.room
    const roomBookings = (bookingsByRoom.get(room.id) ?? []).filter((b) => visible.includes(b.status))

    gridChildren.push(
      <div
        key={`room-${room.id}`}
        className="sticky left-0 z-10 bg-background flex items-center px-2 text-sm font-medium truncate border-b border-r"
        style={{ gridColumn: 1, gridRow: currentGridRow }}
      >
        {room.room_number}
      </div>,
    )

    for (let i = 0; i < 30; i++) {
      gridChildren.push(
        <div
          key={`cell-${room.id}-${i}`}
          className="border-b border-r"
          style={{ gridColumn: i + 2, gridRow: currentGridRow }}
        />,
      )
    }

    for (const booking of roomBookings) {
      const startIdx = Math.max(0, getDayIndex(booking.check_in))
      const endIdx = Math.min(30, getDayIndex(booking.check_out))
      const span = Math.max(1, endIdx - startIdx)

      gridChildren.push(
        <Tooltip key={`booking-${booking.id}`}>
          <TooltipTrigger
            render={
              <Link
                href={`/dashboard/bookings/${booking.id}`}
                className={cn(
                  "flex items-center px-1.5 text-xs font-medium rounded-sm overflow-hidden border border-transparent hover:opacity-80 transition-opacity",
                  statusColors[booking.status] ?? "bg-muted",
                )}
                style={{ gridColumn: `${startIdx + 2} / span ${span}`, gridRow: currentGridRow }}
              />
            }
          >
            {room.room_number}
          </TooltipTrigger>
          <TooltipContent side="top" className="space-y-1">
            <p className="font-medium">
              {booking.guests?.full_name ?? "Maintenance"}
            </p>
            <p className="text-xs text-muted-foreground">
              Room {room.room_number} · {room.room_categories.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(booking.check_in + "T00:00:00"), "MMM d")} →{" "}
              {format(new Date(booking.check_out + "T00:00:00"), "MMM d")}
            </p>
            <Badge
              variant="outline"
              className="text-[11px] capitalize"
            >
              {booking.status.replace(/_/g, " ")}
            </Badge>
          </TooltipContent>
        </Tooltip>,
      )
    }

    currentGridRow++
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((s) => {
          const on = visible.includes(s.key)
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setVisible((v) => (v.includes(s.key) ? v.filter((k) => k !== s.key) : [...v, s.key]))
              }
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                !on && "line-through opacity-40",
              )}
            >
              <span className={cn("size-2.5 rounded-sm border", statusColors[s.key] ?? "bg-muted")} />
              {s.label}
            </button>
          )
        })}
      </div>
      <div className="overflow-auto rounded-lg border">
        <div
          className="grid min-w-[900px]"
          style={{
            gridTemplateColumns: `180px repeat(30, minmax(48px, 1fr))`,
          }}
        >
          {gridChildren}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {STATUS_OPTIONS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm border", statusColors[s.key] ?? "bg-muted")} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
