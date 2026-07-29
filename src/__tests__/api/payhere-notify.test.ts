import { describe, it, expect, vi, beforeEach } from "vitest"

const {
  mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult,
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

  return { mockFrom, mockEq, mockSelect, mockSingle, mockUpdate, mockUpsert, selectResult }
})

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock("@/lib/payhere", () => ({
  verifyNotification: vi.fn((_merchantId, _orderId, _amount, _currency, _statusCode, md5sig, _secret) => {
    return md5sig !== "INVALID"
  }),
}))

import { POST } from "@/app/api/payhere/notify/route"

function buildFormRequest(params: Record<string, string>): Request {
  const formData = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    formData.append(k, v)
  }
  return new Request("https://example.com/api/payhere/notify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  })
}

describe("POST /api/payhere/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult.data = null
    selectResult.error = null
  })

  it("returns 400 when signature is invalid", async () => {
    const response = await POST(buildFormRequest({
      merchant_id: "1236547",
      order_id: "BOOK-TEST1234",
      payment_id: "pay_1",
      payhere_amount: "100.00",
      payhere_currency: "USD",
      status_code: "2",
      md5sig: "INVALID",
      custom_1: "",
      custom_2: "",
    }))

    expect(response.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("returns 200 but does nothing when status_code is not 2", async () => {
    const response = await POST(buildFormRequest({
      merchant_id: "1236547",
      order_id: "BOOK-TEST1234",
      payment_id: "pay_2",
      payhere_amount: "100.00",
      payhere_currency: "USD",
      status_code: "-1",
      md5sig: "VALID_HASH",
      custom_1: "",
      custom_2: "",
    }))

    expect(response.status).toBe(200)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("confirms group bookings and creates payment with card_payhere method", async () => {
    selectResult.data = [{ id: "booking-g-1" }]

    const response = await POST(buildFormRequest({
      merchant_id: "1236547",
      order_id: "BOOK-GROUP123",
      payment_id: "pay_group_1",
      payhere_amount: "500.00",
      payhere_currency: "USD",
      status_code: "2",
      md5sig: "VALID_HASH",
      custom_1: "group-1",
      custom_2: "",
    }))

    expect(response.status).toBe(200)
    expect(mockFrom).toHaveBeenNthCalledWith(1, "bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("group_booking_id", "group-1")
    expect(mockEq).toHaveBeenCalledWith("status", "pending_payment")

    expect(mockFrom).toHaveBeenCalledWith("payments")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "booking-g-1",
        amount_usd: 500,
        method: "card_payhere",
        status: "completed",
        payhere_payment_id: "pay_group_1",
      }),
      expect.objectContaining({ onConflict: "booking_id" }),
    )

    expect(mockFrom).toHaveBeenCalledWith("equipment_bookings")
  })

  it("confirms single booking when custom_2 has booking_id", async () => {
    selectResult.data = { id: "booking-s-1" }

    const response = await POST(buildFormRequest({
      merchant_id: "1236547",
      order_id: "BOOK-SINGLE12",
      payment_id: "pay_single_1",
      payhere_amount: "250.00",
      payhere_currency: "USD",
      status_code: "2",
      md5sig: "VALID_HASH",
      custom_1: "",
      custom_2: "booking-s-1",
    }))

    expect(response.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith("bookings")
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmed" })
    expect(mockEq).toHaveBeenCalledWith("id", "booking-s-1")

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "booking-s-1",
        amount_usd: 250,
        method: "card_payhere",
        payhere_payment_id: "pay_single_1",
      }),
      expect.any(Object),
    )
  })

  it("does nothing when group_booking_id matches no bookings", async () => {
    selectResult.data = []

    const response = await POST(buildFormRequest({
      merchant_id: "1236547",
      order_id: "BOOK-EMPTY123",
      payment_id: "pay_empty",
      payhere_amount: "300.00",
      payhere_currency: "USD",
      status_code: "2",
      md5sig: "VALID_HASH",
      custom_1: "group-empty",
      custom_2: "",
    }))

    expect(response.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith("bookings")
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
