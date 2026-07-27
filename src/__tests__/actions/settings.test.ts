import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getSettings, updateSettings } from "@/lib/actions/settings"

beforeEach(() => { vi.clearAllMocks() })

describe("getSettings", () => {
  it("returns settings", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { check_in_time: "14:00", check_out_time: "11:00", surcharge_pct: 10, min_deposit_pct: 20 },
              error: null,
            }),
          })),
        })),
      })),
    })
    const result = await getSettings()
    expect("data" in result).toBe(true)
    if ("data" in result) expect(result.data.surcharge_pct).toBe(10)
  })
})

describe("updateSettings", () => {
  it("updates settings as admin", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await updateSettings({ check_in_time: "15:00", check_out_time: "10:00", surcharge_pct: 15, min_deposit_pct: 25 })
    expect("data" in result).toBe(true)
  })

  it("rejects non-admin", async () => {
    ;(requireAdmin as any).mockResolvedValue({ error: "Admin access required" })
    const result = await updateSettings({ check_in_time: "15:00" })
    expect("error" in result).toBe(true)
  })

  it("rejects invalid data", async () => {
    ;(requireAdmin as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await updateSettings({ surcharge_pct: 200 })
    expect("error" in result).toBe(true)
  })
})
