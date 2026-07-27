import { describe, it, expect, vi, beforeEach } from "vitest"

const {
  mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult,
  capturedOnPayload,
} = vi.hoisted(() => {
  const selectResult: { data: unknown; error: unknown; single: (...args: unknown[]) => unknown } = {
    data: null, error: null, single: () => Promise.resolve(selectResult),
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

  const capturedOnPayload: { current: ((payload: unknown) => Promise<void>) | null } = {
    current: null,
  }

  return {
    mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult,
    capturedOnPayload,
  }
})

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock("@polar-sh/nextjs", () => ({
  Webhooks: vi.fn((config: { onPayload: (payload: unknown) => Promise<void> }) => {
    capturedOnPayload.current = config.onPayload
    return vi.fn()
  }),
}))

import "@/app/api/polar/webhook/route"

async function onPayload(payload: Record<string, unknown>) {
  await capturedOnPayload.current!(payload)
}

describe("POST /api/polar/webhook (onPayload)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult.data = null
    selectResult.error = null
  })

  it("ignores event when type is not order.paid", async () => {
    await onPayload({ type: "checkout.created" })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("ignores event when data is missing", async () => {
    await onPayload({ type: "order.paid" })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("ignores event when metadata has neither booking_id nor group_booking_id", async () => {
    await onPayload({
      type: "order.paid",
      data: { id: "po_1", amount: 5000, metadata: {} },
    })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("confirms group bookings and creates payment on order.paid with group_booking_id", async () => {
    selectResult.data = [{ id: "booking-g-1" }]

    await onPayload({
      type: "order.paid",
      data: {
        id: "po_group",
        amount: 10000,
        metadata: { group_booking_id: "group-1" },
      },
    })

    expect(mockFrom).toHaveBeenNthCalledWith(1, "bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("group_booking_id", "group-1")
    expect(mockEq).toHaveBeenCalledWith("status", "pending_payment")
    expect(mockSelect).toHaveBeenCalledWith("id")

    expect(mockFrom).toHaveBeenCalledWith("payments")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "booking-g-1",
        amount_usd: 100,
        method: "card_polar",
        status: "completed",
        polar_order_id: "po_group",
      }),
      expect.objectContaining({ onConflict: "booking_id" }),
    )

    expect(mockFrom).toHaveBeenCalledWith("equipment_bookings")
  })

  it("confirms single booking on order.paid with booking_id", async () => {
    selectResult.data = { id: "booking-s-1" }

    await onPayload({
      type: "order.paid",
      data: {
        id: "po_single",
        amount: 7500,
        metadata: { booking_id: "booking-s-1" },
      },
    })

    expect(mockFrom).toHaveBeenCalledWith("bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("id", "booking-s-1")
    expect(mockEq).toHaveBeenCalledWith("status", "pending_payment")
    expect(mockSelect).toHaveBeenCalledWith("id")
    expect(mockSingle).toHaveBeenCalled()

    expect(mockFrom).toHaveBeenCalledWith("payments")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "booking-s-1",
        amount_usd: 75,
      }),
      expect.any(Object),
    )
  })

  it("does nothing when no bookings match for group", async () => {
    selectResult.data = []

    await onPayload({
      type: "order.paid",
      data: {
        id: "po_empty",
        amount: 5000,
        metadata: { group_booking_id: "group-empty" },
      },
    })

    expect(mockFrom).toHaveBeenCalledWith("bookings")
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
