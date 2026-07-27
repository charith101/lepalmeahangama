import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEquipmentCategories, getAvailableUnits, createRental, returnUnit, getActiveRentals } from "@/lib/actions/equipment"

beforeEach(() => { vi.clearAllMocks() })

describe("getEquipmentCategories", () => {
  it("returns categories", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: "cat-1", name: "Surfboards" }], error: null }),
      })),
    })
    const result = await getEquipmentCategories()
    expect("data" in result).toBe(true)
  })
})

describe("getAvailableUnits", () => {
  it("returns available units via RPC", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [{ id: "unit-1" }], error: null }),
    })
    const result = await getAvailableUnits("cat-1", "2026-08-01", "2026-08-05")
    expect("data" in result).toBe(true)
  })
})

describe("createRental", () => {
  it("creates rental", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    })
    const result = await createRental({
      unit_id: "u-1", guest_id: "g-1",
      start_date: "2026-08-01", end_date: "2026-08-05", price_usd: 100,
    })
    expect("data" in result).toBe(true)
  })

  it("fails validation", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await createRental({
      unit_id: "", guest_id: "", booking_id: "b-1",
      start_date: "", end_date: "", price_usd: 100,
    })
    expect("error" in result).toBe(true)
  })
})

describe("returnUnit", () => {
  it("returns unit", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await returnUnit("eb-1")
    expect("data" in result).toBe(true)
  })
})

describe("getActiveRentals", () => {
  it("returns active rentals", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "eb-1", equipment_units: {} }], error: null }),
        })),
      })),
    })
    const result = await getActiveRentals()
    expect("data" in result).toBe(true)
  })
})
