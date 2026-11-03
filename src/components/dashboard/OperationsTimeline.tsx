"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarArrowDown, CalendarArrowUp, Car, Bike } from "lucide-react"
import { Input } from "@/components/ui/input"

type TimelineEvent = {
  id: string
  type: "arrival" | "departure" | "transfer" | "equipment_return"
  time: string
  title: string
  subtitle: string
  url?: string
}

export function OperationsTimeline({
  events,
  date,
  isToday = true,
}: {
  events: TimelineEvent[]
  date: string
  isToday?: boolean
}) {
  const router = useRouter()
  const iconMap = {
    arrival: <CalendarArrowDown className="size-4 text-muted-foreground" />,
    departure: <CalendarArrowUp className="size-4 text-muted-foreground" />,
    transfer: <Car className="size-4 text-muted-foreground" />,
    equipment_return: <Bike className="size-4 text-muted-foreground" />,
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{isToday ? "Today's Timeline" : "Operations Timeline"}</h2>
        <Input
          type="date"
          value={date}
          onChange={(e) => router.push(e.target.value ? `/dashboard/operations?date=${e.target.value}` : "/dashboard/operations")}
          className="h-8 w-fit text-xs"
          aria-label="View operations for date"
        />
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{isToday ? "No events today" : "No events"}</p>
      ) : (
        <div className="space-y-0">
          {events.map((ev, i) => {
            const body = (
              <>
                <span className="w-14 shrink-0 text-right text-xs leading-5 text-muted-foreground tabular-nums">
                  {ev.time}
                </span>
                <div className="relative shrink-0">
                  {i < events.length - 1 && (
                    <div className="absolute left-[7px] top-5 -bottom-3 w-px bg-border" />
                  )}
                  <div className="mt-0.5">{iconMap[ev.type]}</div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">{ev.subtitle}</p>
                </div>
              </>
            )
            return ev.url ? (
              <Link
                key={ev.id}
                href={ev.url}
                className="group flex gap-3 rounded-md pb-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {body}
              </Link>
            ) : (
              <div key={ev.id} className="flex gap-3 pb-3">
                {body}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
