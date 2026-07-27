import Link from "next/link"
import {
  ArrowRight,
  CalendarArrowDown,
  CalendarArrowUp,
  Bed,
  Sparkles,
  Clock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function OverviewCards({
  arrivals,
  departures,
  occupancy,
  dirtyRooms,
  pendingCheckins,
}: {
  arrivals: number
  departures: number
  occupancy: number
  dirtyRooms: number
  pendingCheckins: number
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarArrowDown className="size-4" />
            Arrivals Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{arrivals}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarArrowUp className="size-4" />
            Departures Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{departures}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Bed className="size-4" />
            Occupancy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{occupancy}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4" />
            Dirty / Cleaning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{dirtyRooms}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" />
            Pending Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-bold">{pendingCheckins}</p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/bookings" />}
          >
            View All
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
