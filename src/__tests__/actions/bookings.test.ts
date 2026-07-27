import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  requireStaff: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/polar", () => ({
  createCheckoutSession: vi.fn(),
}))

import { requireStaff } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createCheckoutSession } from "@/lib/polar"
import {
  createBooking, createMultiRoomBooking, getBooking, getBookingsByGroup,
  checkIn, checkOut, cancelBooking, updateBookingStatus,
  getTodayArrivals, getTodayDepartures, lookupBookingByRef, lookupBookingByGroupId, recordDeposit,
} from "@/lib/actions/bookings"

function mockAdminSingle(result: any) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(result),
        })),
        in: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(result),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn(),
      })),
    })),
  }
}

function mockServer(returns: any = {}) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((query?: string) => ({
        eq: vi.fn((field: string, val: any) => ({
          single: vi.fn().mockResolvedValue(returns.single ?? { data: null, error: null }),
          in: vi.fn(),
          order: vi.fn(),
          gte: vi.fn(),
          lte: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        in: vi.fn((field: string, vals: any[]) => ({
          eq: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(() => ({
          range: vi.fn(),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(returns.update ?? { data: null, error: null }),
        in: vi.fn(),
      })),
      rpc: vi.fn().mockResolvedValue(returns.rpc ?? { data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue(returns.rpc ?? { data: [], error: null }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createBooking", () => {
  it("creates booking with guest_id", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }),
            })),
          })),
        }
        if (table === "room_categories") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }),
            })),
          })),
        }
        if (table === "guests") return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        }
        if (table === "bookings") return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "booking-1", room_total_usd: 800 }, error: null }),
            })),
          })),
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })

    const result = await createBooking({
      guest_id: "guest-1", room_id: "room-1",
      check_in: "2026-08-01", check_out: "2026-08-05",
      status: "confirmed", source: "website",
    })
    expect("data" in result).toBe(true)
  })

  it("creates guest if no guest_id", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }),
            })),
          })),
        }
        if (table === "room_categories") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }),
            })),
          })),
        }
        if (table === "guests") return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "guest-1" }, error: null }),
            })),
          })),
        }
        if (table === "bookings") return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "booking-1" }, error: null }),
            })),
          })),
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })

    const result = await createBooking({
      guest: { full_name: "John" }, room_id: "room-1",
      check_in: "2026-08-01", check_out: "2026-08-05",
      status: "confirmed", source: "website",
    })
    expect("data" in result).toBe(true)
  })

  it("returns error on room not found", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    })
    const result = await createBooking({ guest_id: "g-1", room_id: "bad", check_in: "2026-08-01", check_out: "2026-08-05", status: "confirmed", source: "website" })
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("Room not found")
  })

  it("returns error if no guest id or data", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }) })) })) }
        if (table === "room_categories") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }) })) })) }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })
    const result = await createBooking({ room_id: "r-1", check_in: "2026-08-01", check_out: "2026-08-05", status: "confirmed", source: "website" })
    expect("error" in result).toBe(true)
  })

  it("includes equipment and transfer", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }) })) })) }
        if (table === "room_categories") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }) })) })) }
        if (table === "guests") return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })) }
        if (table === "bookings") return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "b-1" }, error: null }) })) })) }
        if (table === "equipment_bookings") return { insert: vi.fn() }
        if (table === "airport_transfers") return { insert: vi.fn() }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })
    const result = await createBooking({
      guest_id: "g-1", room_id: "r-1",
      check_in: "2026-08-01", check_out: "2026-08-05",
      status: "confirmed", source: "website",
      equipment: [{ unit_id: "u-1", start_date: "2026-08-01", end_date: "2026-08-05" }],
      transfer: { route_id: "rt-1", direction: "arrival", flight_number: "BA123", transfer_datetime: "2026-08-01T10:00", price_usd: 50 },
    })
    expect("data" in result).toBe(true)
  })
})

describe("createMultiRoomBooking", () => {
  it("creates multi-room booking with polar checkout", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }) })) })) }
        if (table === "room_categories") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }) })) })) }
        if (table === "guests") return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "guest-1" }, error: null }) })) })),
          delete: vi.fn(() => ({ eq: vi.fn() })),
        }
        if (table === "bookings") return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "b-1" }, error: null }) })) })),
          delete: vi.fn(() => ({ in: vi.fn() })),
        }
        if (table === "equipment_bookings") return { insert: vi.fn(), delete: vi.fn(() => ({ in: vi.fn() })) }
        if (table === "airport_transfers") return { insert: vi.fn() }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })
    ;(createCheckoutSession as any).mockResolvedValue({ url: "https://checkout.polar.sh/test" })
    const result = await createMultiRoomBooking({
      guest: { full_name: "John Doe", email: "john@example.com", phone: "+94 77 123 4567", nationality: "British", nic_or_passport: "AB123456" },
      roomSelections: [{ room_id: "r-1", check_in: "2026-08-01", check_out: "2026-08-05" }],
      grand_total_usd: 800,
    })
    expect("data" in result).toBe(true)
    if ("data" in result) expect(result.data.polarCheckoutUrl).toBe("https://checkout.polar.sh/test")
  })

  it("rolls back on polar failure", async () => {
    ;(createAdminClient as any).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rooms") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { category_id: "cat-1" }, error: null }) })) })) }
        if (table === "room_categories") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { base_price_usd: 200 }, error: null }) })) })) }
        if (table === "guests") return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "guest-1" }, error: null }) })) })),
          delete: vi.fn(() => ({ eq: vi.fn() })),
        }
        if (table === "bookings") return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "b-1" }, error: null }) })) })),
          delete: vi.fn(() => ({ in: vi.fn() })),
        }
        if (table === "equipment_bookings") return { delete: vi.fn(() => ({ in: vi.fn() })) }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) }
      }),
    })
    ;(createCheckoutSession as any).mockRejectedValue(new Error("Polar error"))
    const result = await createMultiRoomBooking({
      guest: { full_name: "John Doe", email: "john@example.com", phone: "+94 77 123 4567", nationality: "British", nic_or_passport: "AB123456" },
      roomSelections: [{ room_id: "r-1", check_in: "2026-08-01", check_out: "2026-08-05" }],
      grand_total_usd: 800,
    })
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toContain("Polar error")
  })

  it("returns validation error for bad guest data", async () => {
    const result = await createMultiRoomBooking({
      guest: { full_name: "" },
      roomSelections: [{ room_id: "r-1", check_in: "2026-08-01", check_out: "2026-08-05" }],
    })
    expect("error" in result).toBe(true)
  })
})

describe("getBooking", () => {
  it("returns booking data", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue(mockServer({ single: { data: { id: "b-1" }, error: null } }))
    const result = await getBooking("b-1")
    expect("data" in result).toBe(true)
  })

  it("returns error if not auth", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    const result = await getBooking("b-1")
    expect("error" in result).toBe(true)
  })
})

describe("getBookingsByGroup", () => {
  it("returns group bookings", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue(mockServer({}))
    const result = await getBookingsByGroup("group-1")
    expect("data" in result).toBe(true)
  })
})

describe("checkIn", () => {
  it("checks in successfully", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    const updateMock = vi.fn().mockResolvedValue({ data: null, error: null })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { guest_id: "guest-1" }, error: null }),
          })),
        })),
      })),
    })
    const result = await checkIn("b-1", "AB123456")
    expect("data" in result).toBe(true)
  })
})

describe("checkOut", () => {
  it("checks out successfully", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await checkOut("b-1")
    expect("data" in result).toBe(true)
  })
})

describe("cancelBooking", () => {
  it("cancels without payments", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    const selChain: any = vi.fn(() => selChain)
    selChain.eq = vi.fn(() => selChain)
    selChain.single = vi.fn().mockResolvedValue({ data: { id: "b-1", status: "confirmed" }, error: null })
    selChain.in = vi.fn(() => selChain)
    selChain.then = (onfulfilled: any) => Promise.resolve({ data: [{ id: "pay-1", method: "card_polar", status: "completed" }], error: null }).then(onfulfilled)
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => selChain),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await cancelBooking("b-1")
    expect("data" in result).toBe(true)
  })

  it("cancels with completed polar payment", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "bookings") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "b-1", status: "confirmed" }, error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
        if (table === "payments") return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "pay-1", method: "card_polar", status: "completed" }], error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
        return {
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }),
    })
    const result = await cancelBooking("b-1")
    expect("data" in result).toBe(true)
  })
})

describe("updateBookingStatus", () => {
  it("updates status", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await updateBookingStatus("b-1", "checked_in")
    expect("data" in result).toBe(true)
  })
})

describe("getTodayArrivals", () => {
  it("returns arrivals", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ id: "b-1" }], error: null }),
          })),
        })),
      })),
    })
    const result = await getTodayArrivals()
    expect("data" in result).toBe(true)
  })
})

describe("getTodayDepartures", () => {
  it("returns departures", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ id: "b-1" }], error: null }),
          })),
        })),
      })),
    })
    const result = await getTodayDepartures()
    expect("data" in result).toBe(true)
  })
})

describe("lookupBookingByRef", () => {
  it("finds booking by ref", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [{ id: "b-1", guest_full_name: "John" }], error: null }),
    })
    const result = await lookupBookingByRef("BOOK-1", "john@test.com")
    expect("data" in result).toBe(true)
  })

  it("returns error on no match", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const result = await lookupBookingByRef("BOOK-1", "john@test.com")
    expect("error" in result).toBe(true)
  })
})

describe("lookupBookingByGroupId", () => {
  it("finds bookings by group id", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "b-1", guests: { email: "john@test.com" } }], error: null }),
        })),
      })),
    })
    const result = await lookupBookingByGroupId("group-1", "john@test.com")
    expect("data" in result).toBe(true)
  })

  it("returns error on email mismatch", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "b-1", guests: { email: "other@test.com" } }], error: null }),
        })),
      })),
    })
    const result = await lookupBookingByGroupId("group-1", "john@test.com")
    expect("error" in result).toBe(true)
  })
})

describe("recordDeposit", () => {
  it("records deposit", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    })
    const result = await recordDeposit("b-1", 100)
    expect("data" in result).toBe(true)
  })

  it("rejects non-positive amount", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "staff-1", role: "admin" } })
    const result = await recordDeposit("b-1", 0)
    expect("error" in result).toBe(true)
  })
})
