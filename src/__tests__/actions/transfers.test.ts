import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransferRoutes, createTransfer, updateTransferStatus, getSchedule } from "@/lib/actions/transfers"

beforeEach(() => { vi.clearAllMocks() })

describe("getTransferRoutes", () => {
  it("returns active routes", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "rt-1", name: "CMB to Hotel" }], error: null }),
        })),
      })),
    })
    const result = await getTransferRoutes()
    expect("data" in result).toBe(true)
  })
})

describe("createTransfer", () => {
  it("creates transfer", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    })
    const result = await createTransfer({
      route_id: "rt-1", guest_id: "g-1",
      direction: "arrival", flight_number: "BA123",
      transfer_datetime: "2026-08-01T10:00", price_usd: 50,
    })
    expect("data" in result).toBe(true)
  })

  it("fails validation", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await createTransfer({
      route_id: "", guest_id: "",
      direction: "arrival",
      transfer_datetime: "", price_usd: 50,
    })
    expect("error" in result).toBe(true)
  })
})

describe("updateTransferStatus", () => {
  it("updates status", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await updateTransferStatus("t-1", "completed")
    expect("data" in result).toBe(true)
  })
})

describe("getSchedule", () => {
  it("returns schedule for date", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [{ id: "t-1" }], error: null }),
            })),
          })),
        })),
      })),
    })
    const result = await getSchedule("2026-08-01")
    expect("data" in result).toBe(true)
  })
})
