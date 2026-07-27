"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/AppSidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

const titleMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/calendar": "Calendar",
  "/dashboard/bookings": "Bookings",
  "/dashboard/bookings/new": "New Booking",
  "/dashboard/guests": "Guests",
  "/dashboard/housekeeping": "Housekeeping",
  "/dashboard/operations": "Operations",
  "/dashboard/equipment": "Equipment",
  "/dashboard/transfers": "Transfers",
  "/dashboard/admin": "Admin",
}

export function DashboardShell({
  staffName,
  userRole,
  children,
}: {
  staffName: string
  userRole: string
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const title = titleMap[pathname] ?? (pathname.startsWith("/dashboard/guests/") ? "Guest Profile" : "Dashboard")

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={userRole} open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader
          title={title}
          staffName={staffName}
          role={userRole}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
