"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DownloadIcon, SearchIcon } from "lucide-react"

interface Guest {
  id: string
  full_name: string
  nic_or_passport: string | null
  nationality: string | null
  email: string | null
  phone: string | null
  created_at: string
}

export function GuestTable({ guests }: { guests: Guest[] }) {
  const [search, setSearch] = useState("")

  const filtered = guests.filter((g) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      g.full_name.toLowerCase().includes(q) ||
      (g.email?.toLowerCase().includes(q) ?? false) ||
      (g.phone?.toLowerCase().includes(q) ?? false)
    )
  })

  function exportCSV() {
    const header = "Full Name,NIC/Passport,Nationality,Email,Phone,Created At"
    const rows = filtered.map((g) =>
      [
        g.full_name,
        g.nic_or_passport ?? "",
        g.nationality ?? "",
        g.email ?? "",
        g.phone ?? "",
        new Date(g.created_at).toLocaleDateString(),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "guests.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <DownloadIcon />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>NIC/Passport</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-medium">
                <Link href={`/dashboard/guests/${g.id}`} className="hover:underline">
                  {g.full_name}
                </Link>
              </TableCell>
              <TableCell>{g.nic_or_passport ?? "—"}</TableCell>
              <TableCell>{g.nationality ?? "—"}</TableCell>
              <TableCell>{g.email ?? "—"}</TableCell>
              <TableCell>{g.phone ?? "—"}</TableCell>
              <TableCell>{new Date(g.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No guests found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
