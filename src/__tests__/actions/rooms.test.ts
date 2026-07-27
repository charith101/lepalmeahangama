import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildBooking } from "../factories"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

import {
  getRoomCategories,
  getAvailableRooms,
  getCalendarBookings,
  getAllRooms,
  getAllAvailableRooms,
  moveGuestToRoom,
  updateRoomHousekeepingStatus,
} from "@/lib/actions/rooms"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getRoomCategories", () => {
  const categories = [
    { id: "1", name: "Standard", base_price_usd: 100 },
    { id: "2", name: "Deluxe", base_price_usd: 200 },
  ]

  it("returns categories ordered by price", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: categories, error: null }),
        })),
      })),
    })
    expect(await getRoomCategories()).toEqual({ data: categories })
  })

  it("returns db error", async () => {
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } }),
        })),
      })),
    })
    expect(await getRoomCategories()).toEqual({ error: "Query failed" })
  })
})

describe("getAvailableRooms", () => {
  const rooms = [
    { id: "r1", room_number: "101" },
    { id: "r2", room_number: "102" },
  ]

  it("returns rooms via RPC", async () => {
    ;(createClient as any).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: rooms, error: null }),
    })
    expect(await getAvailableRooms("cat-1", "2026-08-01", "2026-08-05")).toEqual({ data: rooms })
  })

  it("returns db error", async () => {
    ;(createClient as any).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "RPC failed" } }),
    })
    expect(await getAvailableRooms("cat-1", "2026-08-01", "2026-08-05")).toEqual({ error: "RPC failed" })
  })
})

describe("getCalendarBookings", () => {
  const events = [
    { id: "1", title: "Booking #1", start: "2026-08-01", end: "2026-08-05" },
  ]

  it("returns calendar booking events", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: events, error: null }),
    })
    expect(await getCalendarBookings("2026-08-01", "2026-08-31")).toEqual({ data: events })
  })

  it("returns auth error", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getCalendarBookings("2026-08-01", "2026-08-31")).toEqual({ error: "Not authenticated" })
  })

  it("returns db error", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "RPC failed" } }),
    })
    expect(await getCalendarBookings("2026-08-01", "2026-08-31")).toEqual({ error: "RPC failed" })
  })
})

describe("getAllRooms", () => {
  const rooms = [
    { id: "r1", room_number: "101", room_categories: { name: "Standard" } },
    { id: "r2", room_number: "102", room_categories: { name: "Deluxe" } },
  ]

  it("returns all rooms with category names", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: rooms, error: null }),
        })),
      })),
    })
    expect(await getAllRooms()).toEqual({ data: rooms })
  })

  it("returns auth error", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getAllRooms()).toEqual({ error: "Not authenticated" })
  })

  it("returns db error", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } }),
        })),
      })),
    })
    expect(await getAllRooms()).toEqual({ error: "Query failed" })
  })
})

describe("getAllAvailableRooms", () => {
  const room1 = { id: "r1", room_number: "101", room_categories: { name: "Standard" }, operational_status: "active" }
  const room2 = { id: "r2", room_number: "102", room_categories: { name: "Deluxe" }, operational_status: "active" }

  it("excludes booked rooms during the period", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "bookings") return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              lt: vi.fn(() => ({
                gt: vi.fn().mockResolvedValue({ data: [{ room_id: "r1" }], error: null }),
              })),
            })),
          })),
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [room1, room2], error: null }),
            })),
          })),
        }
      }),
    })

    const result = await getAllAvailableRooms("2026-08-01", "2026-08-05")
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe("r2")
  })

  it("returns all rooms when none are booked", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "bookings") return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              lt: vi.fn(() => ({
                gt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [room1, room2], error: null }),
            })),
          })),
        }
      }),
    })

    const result = await getAllAvailableRooms("2026-08-01", "2026-08-05")
    expect(result.data).toHaveLength(2)
  })

  it("returns empty array when all rooms are booked", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "bookings") return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              lt: vi.fn(() => ({
                gt: vi.fn().mockResolvedValue({ data: [{ room_id: "r1" }, { room_id: "r2" }], error: null }),
              })),
            })),
          })),
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [room1, room2], error: null }),
            })),
          })),
        }
      }),
    })

    const result = await getAllAvailableRooms("2026-08-01", "2026-08-05")
    expect(result.data).toHaveLength(0)
  })

  it("returns auth error", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await getAllAvailableRooms("2026-08-01", "2026-08-05")).toEqual({ error: "Not authenticated" })
  })

  it("returns db error from rooms query", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "bookings") return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              lt: vi.fn(() => ({
                gt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: "Rooms query failed" } }),
            })),
          })),
        }
      }),
    })

    expect(await getAllAvailableRooms("2026-08-01", "2026-08-05")).toEqual({ error: "Rooms query failed" })
  })
})

describe("moveGuestToRoom", () => {
  const bookingId = "booking-1"
  const newRoomId = "room-2"
  const booking = { check_in: "2026-08-01", check_out: "2026-08-05" }

  it("moves guest to new room and revalidates the path", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })

    const getBookingQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: booking, error: null }),
        })),
      })),
    }

    const conflictQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            lt: vi.fn(() => ({
              gt: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        })),
      })),
    }

    const updateQuery = {
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }

    ;(createClient as any).mockResolvedValue({
      from: vi.fn()
        .mockReturnValueOnce(getBookingQuery)
        .mockReturnValueOnce(conflictQuery)
        .mockReturnValueOnce(updateQuery),
    })

    const result = await moveGuestToRoom(bookingId, newRoomId)
    expect(result).toEqual({ data: null })
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/bookings/${bookingId}`)
  })

  it("returns error when booking is not found", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }),
    })

    const result = await moveGuestToRoom(bookingId, newRoomId)
    expect(result).toEqual({ error: "Booking not found" })
  })

  it("returns error when the target room is occupied during those dates", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: booking, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                lt: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    neq: vi.fn().mockResolvedValue({ data: [{ id: "conflict-booking" }], error: null }),
                  })),
                })),
              })),
            })),
          })),
        }),
    })

    const result = await moveGuestToRoom(bookingId, newRoomId)
    expect(result).toEqual({ error: "Selected room is occupied during those dates" })
  })

  it("returns auth error", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await moveGuestToRoom(bookingId, newRoomId)).toEqual({ error: "Not authenticated" })
  })

  it("returns db error when the update fails", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: booking, error: null }),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                lt: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    neq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
          })),
        }),
    })

    const result = await moveGuestToRoom(bookingId, newRoomId)
    expect(result).toEqual({ error: "Update failed" })
  })
})

describe("updateRoomHousekeepingStatus", () => {
  it("updates housekeeping status and returns null data", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })
    expect(await updateRoomHousekeepingStatus("room-1", "clean")).toEqual({ data: null })
  })

  it("returns auth error", async () => {
    ;(requireStaff as any).mockResolvedValue({ error: "Not authenticated" })
    expect(await updateRoomHousekeepingStatus("room-1", "clean")).toEqual({ error: "Not authenticated" })
  })

  it("returns db error", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
        })),
      })),
    })
    expect(await updateRoomHousekeepingStatus("room-1", "clean")).toEqual({ error: "Update failed" })
  })
})
