import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

export function RevenueCard({
  todayRevenue,
  monthToDate,
  outstanding,
}: {
  todayRevenue: number
  monthToDate: number
  outstanding: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Today</span>
          <span className="font-semibold">{formatCurrency(todayRevenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">This Month</span>
          <span className="font-semibold">{formatCurrency(monthToDate)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Outstanding</span>
          <span className="font-semibold text-destructive">{formatCurrency(outstanding)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
