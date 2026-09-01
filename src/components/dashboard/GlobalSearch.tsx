"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, UsersIcon, BookOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"

interface SearchResult {
  result_type: "guest" | "booking"
  id: string
  guest_id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  check_in: string | null
  check_out: string | null
  status: string | null
  room_number: string | null
  group_booking_id: string | null
}

function refCode(r: SearchResult) {
  return (r.group_booking_id ?? "").slice(0, 8).toUpperCase()
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  function openDialog() {
    setQuery("")
    setResults([])
    setLoading(false)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setQuery("")
    setResults([])
    setLoading(false)
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (open) closeDialog()
        else openDialog()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  function handleQueryChange(value: string) {
    setQuery(value)
    setResults([])
    setLoading(false)
  }

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 1) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, open])

  const guests = results.filter((r) => r.result_type === "guest")
  const bookings = results.filter((r) => r.result_type === "booking")

  function go(url: string) {
    closeDialog()
    router.push(url)
  }

  return (
    <>
      <Button
        variant="ghost"
        className="gap-2 px-2.5 text-muted-foreground"
        size="sm"
        onClick={openDialog}
        aria-label="Search guests and bookings"
        title="Search (⌘K)"
      >
        <SearchIcon />
        <span>Search</span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(o) => (o ? openDialog() : closeDialog())}
        title="Search"
        description="Search guests and bookings"
        className="sm:max-w-md"
      >
        <Command>
          <CommandInput
            placeholder="Search guest name, booking ref, room, email, phone..."
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No results found."}
            </CommandEmpty>
            {guests.length > 0 && (
              <CommandGroup heading="Guests">
                {guests.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`guest ${r.full_name ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`}
                    onSelect={() => go(`/dashboard/guests/${r.id}`)}
                  >
                    <UsersIcon />
                    <span className="flex-1 truncate">{r.full_name ?? "Guest"}</span>
                    {r.email && (
                      <span className="truncate text-xs text-muted-foreground">{r.email}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {guests.length > 0 && bookings.length > 0 && <CommandSeparator />}
            {bookings.length > 0 && (
              <CommandGroup heading="Bookings">
                {bookings.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`booking ${r.full_name ?? ""} ${refCode(r)} ${r.room_number ?? ""} ${r.status ?? ""}`}
                    onSelect={() => go(`/dashboard/bookings/${r.id}`)}
                  >
                    <BookOpenIcon />
                    <span className="flex-1 truncate">{r.full_name ?? "Guest"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {[r.room_number && `Room ${r.room_number}`, refCode(r), r.status?.replace(/_/g, " ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
