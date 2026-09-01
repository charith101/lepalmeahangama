import { CalendarArrowDown, CalendarArrowUp, Car, Bike } from "lucide-react"

type TimelineEvent = {
  id: string
  type: "arrival" | "departure" | "transfer" | "equipment_return"
  time: string
  title: string
  subtitle: string
}

export function OperationsTimeline({ events }: { events: TimelineEvent[] }) {
  const iconMap = {
    arrival: <CalendarArrowDown className="size-4 text-muted-foreground" />,
    departure: <CalendarArrowUp className="size-4 text-muted-foreground" />,
    transfer: <Car className="size-4 text-muted-foreground" />,
    equipment_return: <Bike className="size-4 text-muted-foreground" />,
  }

  if (events.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Timeline</h2>
        <p className="text-sm text-muted-foreground">No events today</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Today&apos;s Timeline</h2>
      <div className="space-y-0">
        {events.slice(0, 15).map((ev, i) => (
          <div key={ev.id} className="flex gap-3 pb-3 relative">
            {i < events.length - 1 && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
            )}
            <div className="shrink-0 mt-0.5">{iconMap[ev.type]}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ev.title}</p>
              <p className="text-xs text-muted-foreground">{ev.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      {events.length > 15 && (
        <p className="text-xs text-muted-foreground">+{events.length - 15} more events</p>
      )}
    </div>
  )
}
