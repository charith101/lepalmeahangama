import crypto from "crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

// The confirm helper is the only place a PayHere payment turns into a booking
// state change, so these tests drive it against a tiny in-memory Supabase fake
// and assert the three things that must never regress: money is recorded once,
// the email is sent once, and a `cancelled` hold is revived only by a charge we
// have not seen before.

type Row = Record<string, unknown>
type Filter = [column: string, value: unknown]

const state = {
  bookings: [] as Row[],
  payments: [] as Row[],
  equipment: [] as Row[],
  transfers: [] as Row[],
  // Simulates the room exclusion constraint rejecting a revive.
  failBookingUpdate: false,
}

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every(([column, value]) =>
    Array.isArray(value) ? value.includes(row[column]) : row[column] === value,
  )
}

function updateRows(rows: Row[], filters: Filter[], values: Row): void {
  for (const row of rows) {
    if (matches(row, filters)) Object.assign(row, values)
  }
}

// Minimal chainable PostgREST stand-in: every builder is awaitable and records
// the filters so the fake can answer the handful of queries this module makes.
function rowsFor(table: string): Row[] {
  if (table === "bookings") return state.bookings
  if (table === "payments") return state.payments
  if (table === "equipment_bookings") return state.equipment
  if (table === "airport_transfers") return state.transfers
  return []
}

function fakeClient() {
  return {
    from(table: string) {
      const context: { operation: "select" | "update" | "insert"; values?: Row; filters: Filter[] } = {
        operation: "select",
        filters: [],
      }

      const builder = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        update: (values: Row) => {
          context.operation = "update"
          context.values = values
          return builder
        },
        insert: (values: Row) => {
          context.operation = "insert"
          context.values = values
          return builder
        },
        eq: (column: string, value: unknown) => {
          context.filters.push([column, value])
          return builder
        },
        in: (column: string, values: unknown[]) => {
          context.filters.push([column, values])
          return builder
        },
        then: (resolve: (value: { data: Row[] | null; error: { code?: string; message: string } | null }) => unknown) =>
          Promise.resolve(run(table, context)).then(resolve),
      }

      return builder
    },
  }
}

function run(
  table: string,
  context: { operation: "select" | "update" | "insert"; values?: Row; filters: Filter[] },
): { data: Row[] | null; error: { code?: string; message: string } | null } {
  const rows = rowsFor(table)

  if (context.operation === "select") {
    return { data: rows.filter((row) => matches(row, context.filters)), error: null }
  }

  if (context.operation === "update") {
    if (table === "bookings" && state.failBookingUpdate) {
      return {
        data: null,
        error: { code: "23P01", message: "conflicting key value violates exclusion constraint" },
      }
    }
    updateRows(rows, context.filters, context.values ?? {})
    return { data: null, error: null }
  }

  const values = context.values ?? {}
  if (table === "payments") {
    const duplicate = rows.some(
      (row) => row.payhere_payment_id && row.payhere_payment_id === values.payhere_payment_id && row.status === "completed",
    )
    if (duplicate) {
      return { data: null, error: { code: "23505", message: "duplicate key value" } }
    }
  }
  rows.push({ id: `row-${rows.length + 1}`, ...values })
  return { data: null, error: null }
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeClient() }))

const computeBookingTotal = vi.hoisted(() => vi.fn())
vi.mock("@/lib/booking-pricing", () => ({ computeBookingTotal }))

const sendBookingConfirmation = vi.hoisted(() => vi.fn())
const sendPaymentFailedEmail = vi.hoisted(() => vi.fn())
vi.mock("@/lib/email", () => ({ sendBookingConfirmation, sendPaymentFailedEmail }))

const GROUP = "a04c0e45-65d2-4ff6-8063-51c36f853bf1"
const BOOKING = "8b8fea07-083f-46bb-99ed-e49a97fcc140"
const PAYMENT_ID = "320032679847"

function seedBooking(status: string): void {
  state.bookings = [
    {
      id: BOOKING,
      group_booking_id: GROUP,
      status,
      created_at: "2026-10-28T15:12:26.000Z",
    },
  ]
}

describe("confirmPayHerePayment", () => {
  beforeEach(() => {
    state.bookings = []
    state.payments = []
    state.equipment = [{ id: "eq-1", booking_id: BOOKING, status: "pending" }]
    state.transfers = [{ id: "tr-1", booking_id: BOOKING, status: "scheduled" }]
    state.failBookingUpdate = false
    computeBookingTotal.mockReset()
    computeBookingTotal.mockResolvedValue({ total: 21 })
    sendBookingConfirmation.mockReset()
    sendBookingConfirmation.mockResolvedValue(undefined)
  })

  it("confirms a pending booking, records the charge once and emails once", async () => {
    seedBooking("pending_payment")
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
      paidAt: "2026-10-28T15:12:51.000Z",
    })

    expect(outcome).toMatchObject({ confirmed: true, recordedCharge: true })
    expect(state.bookings[0].status).toBe("confirmed")
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({
      booking_id: BOOKING,
      amount_usd: 21,
      status: "completed",
      payhere_payment_id: PAYMENT_ID,
      paid_at: "2026-10-28T15:12:51.000Z",
    })
    expect(state.equipment[0].status).toBe("active")
    expect(state.transfers[0].status).toBe("scheduled")
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("is idempotent when notify and the return page both report the same charge", async () => {
    seedBooking("pending_payment")
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")
    const payment = { groupBookingId: GROUP, paymentId: PAYMENT_ID, amount: 21, currency: "USD" }

    await confirmPayHerePayment(payment)
    const second = await confirmPayHerePayment(payment)

    expect(second).toMatchObject({ confirmed: true, recordedCharge: false })
    expect(state.payments).toHaveLength(1)
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("revives a hold the expiry cron cancelled, but only once per charge", async () => {
    seedBooking("cancelled")
    state.equipment[0].status = "cancelled"
    state.transfers[0].status = "cancelled"
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")
    const payment = { groupBookingId: GROUP, paymentId: PAYMENT_ID, amount: 21, currency: "USD" } as const

    await confirmPayHerePayment(payment)
    expect(state.bookings[0].status).toBe("confirmed")
    expect(state.equipment[0].status).toBe("active")
    expect(state.transfers[0].status).toBe("scheduled")

    // A late duplicate must not resurrect a booking staff cancelled afterwards.
    state.bookings[0].status = "cancelled"
    state.equipment[0].status = "cancelled"
    state.transfers[0].status = "cancelled"
    await confirmPayHerePayment(payment)
    expect(state.bookings[0].status).toBe("cancelled")
    expect(state.equipment[0].status).toBe("cancelled")
    expect(state.transfers[0].status).toBe("cancelled")
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("upgrades a failed attempt to completed instead of recording a second charge", async () => {
    seedBooking("pending_payment")
    state.payments = [{ id: "row-failed", booking_id: BOOKING, payhere_payment_id: PAYMENT_ID, status: "failed" }]
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
    })

    expect(outcome).toMatchObject({ confirmed: true, recordedCharge: true })
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({ status: "completed", amount_usd: 21 })
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("never confirms when the paid amount differs from the server total", async () => {
    seedBooking("pending_payment")
    computeBookingTotal.mockResolvedValue({ total: 105 })
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
    })

    expect(outcome).toMatchObject({ confirmed: false, reason: "amount_mismatch" })
    expect(state.bookings[0].status).toBe("pending_payment")
    expect(state.payments).toHaveLength(0)
    expect(sendBookingConfirmation).not.toHaveBeenCalled()
  })

  it("records the money even when a room clash blocks the revive", async () => {
    seedBooking("cancelled")
    state.equipment[0].status = "cancelled"
    state.failBookingUpdate = true
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
    })

    expect(outcome).toMatchObject({ confirmed: false, reason: "update_failed" })
    expect(state.bookings[0].status).toBe("cancelled")
    // The charge must still be visible to staff, but the guest is not told the
    // booking is confirmed and no held inventory is released.
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({ status: "completed", amount_usd: 21 })
    expect(state.equipment[0].status).toBe("cancelled")
    expect(sendBookingConfirmation).not.toHaveBeenCalled()
  })

  it("never re-applies a refunded charge", async () => {
    seedBooking("cancelled")
    state.payments = [{ id: "row-refunded", booking_id: BOOKING, payhere_payment_id: PAYMENT_ID, status: "refunded" }]
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
    })

    expect(outcome).toMatchObject({ confirmed: true, recordedCharge: false })
    expect(state.bookings[0].status).toBe("cancelled")
    expect(state.payments[0]).toMatchObject({ status: "refunded" })
    expect(sendBookingConfirmation).not.toHaveBeenCalled()
  })

  it("rejects a non-USD charge before touching any rows", async () => {
    seedBooking("pending_payment")
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "LKR",
    })

    expect(outcome).toMatchObject({ confirmed: false, reason: "currency_mismatch" })
    expect(state.bookings[0].status).toBe("pending_payment")
  })
  it("still emails when a crashed run confirmed the booking but never recorded the charge", async () => {
    seedBooking("confirmed")
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    const outcome = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: PAYMENT_ID,
      amount: 21,
      currency: "USD",
    })

    expect(outcome).toMatchObject({ confirmed: true, recordedCharge: true })
    expect(state.payments).toHaveLength(1)
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("records a second payment for the same stay without emailing again", async () => {
    seedBooking("pending_payment")
    const { confirmPayHerePayment } = await import("@/lib/payhere-confirm")

    await confirmPayHerePayment({ groupBookingId: GROUP, paymentId: PAYMENT_ID, amount: 21, currency: "USD" })
    const second = await confirmPayHerePayment({
      groupBookingId: GROUP,
      paymentId: "320032679999",
      amount: 21,
      currency: "USD",
    })

    expect(second).toMatchObject({ confirmed: true, recordedCharge: true })
    expect(state.payments).toHaveLength(2)
    expect(state.bookings[0].status).toBe("confirmed")
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })
})

// notify_url is the documented source of truth for a PayHere payment, so drive
// the real route handler with a body PayHere would actually post.
describe("POST /api/payhere/notify", () => {
  const MERCHANT_ID = "1236547"
  const MERCHANT_SECRET = "test_secret_value"
  const ORDER_ID = `BOOK-${GROUP}`

  function sign(amount: string, statusCode: string): string {
    const secretHash = crypto.createHash("md5").update(MERCHANT_SECRET).digest("hex").toUpperCase()
    return crypto
      .createHash("md5")
      .update(MERCHANT_ID + ORDER_ID + amount + "USD" + statusCode + secretHash)
      .digest("hex")
      .toUpperCase()
  }

  async function postNotification(overrides: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/payhere/notify/route")
    const amount = overrides.payhere_amount ?? "21.00"
    const statusCode = overrides.status_code ?? "2"
    const fields: Record<string, string> = {
      merchant_id: MERCHANT_ID,
      order_id: ORDER_ID,
      payment_id: PAYMENT_ID,
      payhere_amount: amount,
      payhere_currency: "USD",
      status_code: statusCode,
      md5sig: sign(amount, statusCode),
      custom_1: GROUP,
      custom_2: BOOKING,
      ...overrides,
    }

    const request = new Request("http://localhost/api/payhere/notify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    })

    return POST(request as unknown as Parameters<typeof POST>[0])
  }

  beforeEach(() => {
    state.bookings = []
    state.payments = []
    state.equipment = [{ id: "eq-1", booking_id: BOOKING, status: "pending" }]
    state.transfers = [{ id: "tr-1", booking_id: BOOKING, status: "scheduled" }]
    state.failBookingUpdate = false
    computeBookingTotal.mockReset()
    computeBookingTotal.mockResolvedValue({ total: 21 })
    sendBookingConfirmation.mockReset()
    sendBookingConfirmation.mockResolvedValue(undefined)
    process.env.PAYHERE_MERCHANT_SECRET = MERCHANT_SECRET
    sendPaymentFailedEmail.mockReset()
  })

  it("confirms the booking once from a correctly signed success notification", async () => {
    seedBooking("pending_payment")

    const response = await postNotification()
    const body = (await response.json()) as { status?: string }

    expect(response.status).toBe(200)
    expect(body.status).toBe("ok")
    expect(state.bookings[0].status).toBe("confirmed")
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({
      status: "completed",
      amount_usd: 21,
      payhere_payment_id: PAYMENT_ID,
    })
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1)
  })

  it("rejects a notification whose signature does not match", async () => {
    seedBooking("pending_payment")

    const response = await postNotification({ md5sig: "0".repeat(32) })

    expect(response.status).toBe(400)
    expect(state.bookings[0].status).toBe("pending_payment")
    expect(state.payments).toHaveLength(0)
  })

  it("never confirms when the signed amount differs from the server total", async () => {
    seedBooking("pending_payment")
    computeBookingTotal.mockResolvedValue({ total: 105 })

    const response = await postNotification({ payhere_amount: "21.00" })

    expect(response.status).toBe(400)
    expect(state.bookings[0].status).toBe("pending_payment")
    expect(sendBookingConfirmation).not.toHaveBeenCalled()
  })

  it("acknowledges a pending status without touching the booking", async () => {
    seedBooking("pending_payment")

    const response = await postNotification({ status_code: "0" })

    expect(response.status).toBe(200)
    expect(state.bookings[0].status).toBe("pending_payment")
    expect(state.payments).toHaveLength(0)
  })
})
