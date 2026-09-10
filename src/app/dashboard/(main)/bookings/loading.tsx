import { Skeleton } from "@/components/ui/skeleton"

function TableSkeleton() {
  return (
    <div className="rounded-md border" aria-busy="true">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`flex items-center gap-4 px-4 py-4 ${i !== 7 ? "border-b" : ""}`}>
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading bookings">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton />
    </div>
  )
}
