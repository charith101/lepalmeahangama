"use client"

import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const roleLabels: Record<string, string> = {
  admin: "Admin",
  receptionist: "Receptionist",
  housekeeping: "Housekeeping",
}

export function DashboardHeader({
  title,
  staffName,
  role,
  onMenuClick,
}: {
  title: string
  staffName: string
  role: string
  onMenuClick: () => void
}) {
  return (
    <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <MenuIcon />
      </Button>
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      <span className="text-sm text-muted-foreground">{staffName}</span>
      <Badge variant="secondary">{roleLabels[role] ?? role}</Badge>
    </header>
  )
}
