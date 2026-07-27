import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildGuest, buildBooking, buildPayment } from "../factories"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  createGuest,
  searchGuests,
  getGuestRegister,
  getGuest,
  updateGuest,
  getGuestWithBookings,
} from "@/lib/actions/guests"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createGuest", () => {
  const guest = buildGuest()

  it("creates a guest and returns the record", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: guest, error: null }),
          })),
        })),
      })),
    })
    expect(await createGuest({ full_name: "John Doe" })).toEqual({ data: guest })
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await createGuest({ full_name: "John Doe" })).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when insert fails", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
          })),
        })),
      })),
    })
    expect(await createGuest({ full_name: "John Doe" })).toEqual({ error: "Insert failed" })
  })
})

describe("searchGuests", () => {
  const guests = [buildGuest(), buildGuest({ full_name: "Jane Doe" })]

  it("returns matching guests", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: guests, error: null }),
          })),
        })),
      })),
    })
    expect(await searchGuests("John")).toEqual({ data: guests })
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await searchGuests("John")).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when query fails", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: "Search failed" } }),
          })),
        })),
      })),
    })
    expect(await searchGuests("John")).toEqual({ error: "Search failed" })
  })

  it("sanitizes SQL wildcards from user input", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    let capturedQuery = ""
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn((q: string) => {
            capturedQuery = q
            return { limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
          }),
        })),
      })),
    })
    await searchGuests("John%_Smith")
    expect(capturedQuery).toBe(
      "full_name.ilike.%JohnSmith%,email.ilike.%JohnSmith%,phone.ilike.%JohnSmith%"
    )
  })
})

describe("getGuestRegister", () => {
  const guests = [buildGuest(), buildGuest()]

  it("returns paginated guests in reverse chronological order", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn().mockResolvedValue({ data: guests, error: null }),
          })),
        })),
      })),
    })
    expect(await getGuestRegister()).toEqual({ data: guests })
  })

  it("computes range from limit and offset", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    const range = vi.fn().mockResolvedValue({ data: [], error: null })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({ range })),
        })),
      })),
    })
    await getGuestRegister({ limit: 10, offset: 20 })
    expect(range).toHaveBeenCalledWith(20, 29)
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getGuestRegister()).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when query fails", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } }),
          })),
        })),
      })),
    })
    expect(await getGuestRegister()).toEqual({ error: "Query failed" })
  })
})

describe("getGuest", () => {
  const guest = buildGuest()

  it("returns a single guest by id", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: guest, error: null }),
          })),
        })),
      })),
    })
    expect(await getGuest(guest.id)).toEqual({ data: guest })
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getGuest("id")).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when guest not found", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          })),
        })),
      })),
    })
    expect(await getGuest("bad-id")).toEqual({ error: "Not found" })
  })
})

describe("updateGuest", () => {
  it("updates a guest and returns null data", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })
    expect(await updateGuest("id", { full_name: "New Name" })).toEqual({ data: null })
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await updateGuest("id", { full_name: "New Name" })).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when update fails", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
        })),
      })),
    })
    expect(await updateGuest("id", { full_name: "New Name" })).toEqual({ error: "Update failed" })
  })
})

describe("getGuestWithBookings", () => {
  const guest = buildGuest()
  const b1 = buildBooking({ room_total_usd: 800 })
  const b2 = buildBooking({ room_total_usd: 400 })
  const p1 = buildPayment({ amount_usd: 600, status: "completed" })
  const p2 = buildPayment({ amount_usd: 200, status: "completed" })
  const p3 = buildPayment({ amount_usd: 100, status: "pending" })

  function mockForGetGuestWithBookings(opts: {
    guest?: any
    bookings?: any[]
    payments?: any[]
  }) {
    const { guest: g, bookings, payments } = opts
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "guests") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(
                g !== undefined
                  ? { data: g, error: null }
                  : { data: null, error: null }
              ),
            })),
          })),
        }
        if (table === "bookings") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: bookings ?? [], error: null }),
            })),
          })),
        }
        if (table === "payments") return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: payments ?? [], error: null }),
          })),
        }
        return {}
      }),
    })
  }

  it("returns guest with bookings and financial totals", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    mockForGetGuestWithBookings({ guest, bookings: [b1, b2], payments: [p1, p2, p3] })

    const result = await getGuestWithBookings(guest.id)
    expect(result.data?.guest).toEqual(guest)
    expect(result.data?.bookings).toEqual([b1, b2])
    expect(result.data?.totalSpent).toBe(1200)
    expect(result.data?.totalPaid).toBe(800)
    expect(result.data?.outstanding).toBe(400)
  })

  it("returns error when guest is not found", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    mockForGetGuestWithBookings({ guest: undefined, bookings: [], payments: [] })

    expect(await getGuestWithBookings("bad-id")).toEqual({ error: "Guest not found" })
  })

  it("handles guest with no bookings", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    mockForGetGuestWithBookings({ guest, bookings: [], payments: [] })

    const result = await getGuestWithBookings(guest.id)
    expect(result.data?.totalSpent).toBe(0)
    expect(result.data?.totalPaid).toBe(0)
    expect(result.data?.outstanding).toBe(0)
  })

  it("handles guest with bookings but no payments", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    mockForGetGuestWithBookings({ guest, bookings: [b1], payments: [] })

    const result = await getGuestWithBookings(guest.id)
    expect(result.data?.totalSpent).toBe(800)
    expect(result.data?.totalPaid).toBe(0)
    expect(result.data?.outstanding).toBe(800)
  })

  it("returns auth error when staff is not authenticated", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getGuestWithBookings("id")).toEqual({ error: "Not authenticated" })
  })
})
