import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import type { Mock } from "vitest"

const {
  mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult,
} = vi.hoisted(() => {
  const selectResult: { data: unknown; error: unknown; single: Mock | undefined } = {
    data: null, error: null, single: undefined,
  }

  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockSingle = vi.fn()
  const mockUpdate = vi.fn()
  const mockUpsert = vi.fn()
  const mockFrom = vi.fn()

  mockEq.mockImplementation(() => ({
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
  }))
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate, upsert: mockUpsert })
  mockSelect.mockReturnValue(selectResult)
  mockSingle.mockResolvedValue(selectResult)
  selectResult.single = mockSingle

  return {
    mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult,
  }
})

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET } from "@/app/api/polar/success/route"
import { getPolarClient } from "@/lib/polar"

describe("GET /api/polar/success", () => {
  const mockCheckoutsGet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    selectResult.data = null
    selectResult.error = null
    ;(getPolarClient as Mock).mockReturnValue({
      checkouts: { get: mockCheckoutsGet },
    })
  })

  it("redirects to /booking when checkout_id is missing", async () => {
    const request = new NextRequest("https://example.com/api/polar/success")
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toMatch(/\/booking$/)
    expect(mockCheckoutsGet).not.toHaveBeenCalled()
  })

  it("confirms group bookings and creates payment on valid group_booking_id", async () => {
    const bookingId = "booking-1"
    mockCheckoutsGet.mockResolvedValue({
      id: "polar-order-1",
      amount: 5000,
      metadata: { group_booking_id: "group-1" },
    })
    selectResult.data = [{ id: bookingId }]

    const request = new NextRequest(
      "https://example.com/api/polar/success?checkout_id=co_abc123",
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain(`/booking/confirmation/${bookingId}`)

    expect(mockFrom).toHaveBeenNthCalledWith(1, "bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("group_booking_id", "group-1")
    expect(mockEq).toHaveBeenCalledWith("status", "pending_payment")
    expect(mockSelect).toHaveBeenCalledWith("id")

    expect(mockFrom).toHaveBeenCalledWith("payments")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: bookingId,
        amount_usd: 50,
        method: "card_polar",
        status: "completed",
        polar_order_id: "polar-order-1",
      }),
      expect.objectContaining({ onConflict: "booking_id" }),
    )

    expect(mockFrom).toHaveBeenCalledWith("equipment_bookings")
  })

  it("confirms single booking on valid booking_id", async () => {
    const bookingId = "booking-single-1"
    mockCheckoutsGet.mockResolvedValue({
      id: "polar-order-2",
      amount: 3000,
      metadata: { booking_id: bookingId },
    })
    selectResult.data = { id: bookingId }

    const request = new NextRequest(
      "https://example.com/api/polar/success?checkout_id=co_def456",
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain(`/booking/confirmation/${bookingId}`)

    expect(mockFrom).toHaveBeenCalledWith("bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("id", bookingId)
    expect(mockEq).toHaveBeenCalledWith("status", "pending_payment")
    expect(mockSelect).toHaveBeenCalledWith("id")
    expect(mockSingle).toHaveBeenCalled()

    expect(mockFrom).toHaveBeenCalledWith("payments")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: bookingId,
        amount_usd: 30,
      }),
      expect.any(Object),
    )
  })

  it("redirects to /booking when metadata has neither group_booking_id nor booking_id", async () => {
    mockCheckoutsGet.mockResolvedValue({
      id: "polar-order-3",
      amount: 1000,
      metadata: {},
    })

    const request = new NextRequest(
      "https://example.com/api/polar/success?checkout_id=co_xyz789",
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toMatch(/\/booking$/)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("redirects to /booking when polar client throws", async () => {
    mockCheckoutsGet.mockRejectedValue(new Error("Polar API error"))

    const request = new NextRequest(
      "https://example.com/api/polar/success?checkout_id=co_error",
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toMatch(/\/booking$/)
  })

  it("redirects to confirmation with empty id when no bookings match for group", async () => {
    mockCheckoutsGet.mockResolvedValue({
      id: "polar-order-4",
      amount: 5000,
      metadata: { group_booking_id: "group-empty" },
    })
    selectResult.data = []

    const request = new NextRequest(
      "https://example.com/api/polar/success?checkout_id=co_empty",
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toMatch(/\/booking\/confirmation\/$/)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
