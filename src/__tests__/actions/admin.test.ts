import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn(), requireAdmin: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireStaff, requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getStaffList, deactivateStaff, updatePricing, toggleRoomMaintenance } from "@/lib/actions/admin"

beforeEach(() => { vi.clearAllMocks() })

describe("getStaffList", () => {
  it("returns staff list", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: "s1", full_name: "Admin", role: "admin" }], error: null }),
      })),
    })
    const result = await getStaffList()
    expect("data" in result).toBe(true)
  })
})

describe("deactivateStaff", () => {
  it("deactivates staff as admin", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await deactivateStaff("s2")
    expect("data" in result).toBe(true)
  })

  it("rejects non-admin", async () => {
    ;(requireAdmin as any).mockResolvedValue({ error: "Admin access required" })
    const result = await deactivateStaff("s2")
    expect("error" in result).toBe(true)
  })
})

describe("updatePricing", () => {
  it("updates pricing as admin", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await updatePricing("cat-1", 250)
    expect("data" in result).toBe(true)
  })

  it("rejects negative price", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await updatePricing("cat-1", -10)
    expect("error" in result).toBe(true)
  })
})

describe("toggleRoomMaintenance", () => {
  it("toggles from active to retired", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const updateMock = vi.fn().mockResolvedValue({ error: null })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await toggleRoomMaintenance("r-1", "active")
    expect("data" in result).toBe(true)
  })

  it("toggles from retired to active", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await toggleRoomMaintenance("r-1", "retired")
    expect("data" in result).toBe(true)
  })
})
