"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  Sparkles,
  Bike,
  Car,
  Settings,
  Activity,
  LogOutIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "receptionist"] },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays, roles: ["admin", "receptionist"] },
  { label: "Bookings", href: "/dashboard/bookings", icon: BookOpen, roles: ["admin", "receptionist"] },
  { label: "Guests", href: "/dashboard/guests", icon: Users, roles: ["admin", "receptionist"] },
  { label: "Operations", href: "/dashboard/operations", icon: Activity, roles: ["admin", "receptionist"] },
  { label: "Housekeeping", href: "/dashboard/housekeeping", icon: Sparkles, roles: ["admin", "receptionist", "housekeeping"] },
  { label: "Equipment", href: "/dashboard/equipment", icon: Bike, roles: ["admin", "receptionist"] },
  { label: "Transfers", href: "/dashboard/transfers", icon: Car, roles: ["admin", "receptionist"] },
  { label: "Admin", href: "/dashboard/admin", icon: Settings, roles: ["admin"] },
]

function SidebarNav({ role, pathname, onNavClick }: { role: string; pathname: string; onNavClick: () => void }) {
  const filtered = navItems.filter((item) => item.roles.includes(role))
  return (
    <nav className="flex flex-col gap-1 p-3 mt-6">
      {filtered.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          />
        }
      >
        <LogOutIcon className="size-4 shrink-0" />
        Logout
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logout</DialogTitle>
          <DialogDescription>Are you sure you want to logout?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleLogout}>Logout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AppSidebar({
  role,
  open,
  onOpenChange,
}: {
  role: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-heading text-base font-medium shrink-0">
        <Image
          src="/images/IMG_1457.png"
          alt="Le Palme logo"
          width={378}
          height={334}
          className="h-8 w-auto"
        />
        Le Palme
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav role={role} pathname={pathname} onNavClick={() => onOpenChange(false)} />
      </div>
      <div className="border-t p-3">
        <LogoutButton />
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar">
        {sidebarContent}
      </aside>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-56 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  )
}
