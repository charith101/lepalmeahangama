import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { reportMaintenanceIssue, getMaintenanceRequests, updateMaintenanceStatus } from "@/lib/actions/maintenance"

beforeEach(() => { vi.clearAllMocks() })

describe("reportMaintenanceIssue", () => {
  it("reports an issue", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    })
    const result = await reportMaintenanceIssue({ roomId: "r-1", description: "Broken AC" })
    expect("data" in result).toBe(true)
  })

  it("rejects empty description", async () => {
    const result = await reportMaintenanceIssue({ roomId: "r-1", description: "" })
    expect("error" in result).toBe(true)
  })
})

describe("getMaintenanceRequests", () => {
  it("returns all requests", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [{ id: "m-1", status: "open" }], error: null }),
        })),
      })),
    })
    const result = await getMaintenanceRequests()
    expect("data" in result).toBe(true)
  })

  it("filters by status", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })
    const result = await getMaintenanceRequests("open")
    expect("data" in result).toBe(true)
  })
})

describe("updateMaintenanceStatus", () => {
  it("resolves an issue", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await updateMaintenanceStatus("m-1", "resolved")
    expect("data" in result).toBe(true)
  })
})
