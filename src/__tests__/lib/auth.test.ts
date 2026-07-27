import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { requireStaff, requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

function mockSupabase(authResult: any, profileResult: any) {
  ;(createClient as any).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue(authResult) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(profileResult),
        })),
      })),
    })),
  })
}

describe("requireStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("passes for admin", async () => {
    mockSupabase({ data: { user: { id: "1" } }, error: null }, { data: { id: "1", role: "admin" }, error: null })
    const result = await requireStaff()
    expect("user" in result).toBe(true)
    if ("user" in result) expect(result.user.role).toBe("admin")
  })

  it("passes for receptionist", async () => {
    mockSupabase({ data: { user: { id: "2" } }, error: null }, { data: { id: "2", role: "receptionist" }, error: null })
    const result = await requireStaff()
    expect("user" in result).toBe(true)
    if ("user" in result) expect(result.user.role).toBe("receptionist")
  })

  it("returns error when no session", async () => {
    mockSupabase({ data: { user: null }, error: { message: "No auth" } }, { data: null, error: { message: "No profile" } })
    const result = await requireStaff()
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Not authenticated")
  })

  it("returns error for housekeeping", async () => {
    mockSupabase({ data: { user: { id: "3" } }, error: null }, { data: { id: "3", role: "housekeeping" }, error: null })
    const result = await requireStaff()
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Insufficient permissions")
  })
})

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("passes for admin", async () => {
    mockSupabase({ data: { user: { id: "1" } }, error: null }, { data: { id: "1", role: "admin" }, error: null })
    const result = await requireAdmin()
    expect("user" in result).toBe(true)
    if ("user" in result) expect(result.user.role).toBe("admin")
  })

  it("rejects receptionist", async () => {
    mockSupabase({ data: { user: { id: "2" } }, error: null }, { data: { id: "2", role: "receptionist" }, error: null })
    const result = await requireAdmin()
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Admin access required")
  })

  it("rejects no session", async () => {
    mockSupabase({ data: { user: null }, error: { message: "No auth" } }, { data: null, error: { message: "No profile" } })
    const result = await requireAdmin()
    expect("error" in result).toBe(true)
  })
})
