import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { postCharge, generateInvoice, getInvoice, recordPayment, confirmBankTransfer } from "@/lib/actions/billing"

beforeEach(() => { vi.clearAllMocks() })

function selectChain(resolved: any) {
  const chain: any = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.neq = vi.fn(() => chain)
  chain.gte = vi.fn(() => chain)
  chain.lte = vi.fn(() => chain)
  chain.gt = vi.fn(() => chain)
  chain.lt = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.range = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue(resolved.single ?? { data: null, error: null })
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved.maybeSingle ?? { data: null, error: null })
  chain.then = (onfulfilled: any) => Promise.resolve(resolved.select ?? { data: [], error: null }).then(onfulfilled)
  return chain
}

function mockFrom(returns: any = {}) {
  return vi.fn((table: string) => {
    if (returns[table]) return returns[table]
    return {
      select: vi.fn((_query?: string) => selectChain(returns)),
      insert: vi.fn().mockResolvedValue(returns.insert ?? { data: null, error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue(returns.update ?? { data: null, error: null }) })),
    }
  })
}

describe("postCharge", () => {
  it("posts a charge", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({ from: mockFrom({ insert: { error: null } }) })
    const result = await postCharge("b-1", { description: "Meal", category: "meal", quantity: 2, unit_price_usd: 25 })
    expect("data" in result).toBe(true)
  })

  it("fails validation for bad data", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await postCharge("b-1", { description: "", category: "meal", quantity: 0, unit_price_usd: 0 })
    expect("error" in result).toBe(true)
  })
})

describe("generateInvoice", () => {
  it("creates new invoice", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({
        single: { data: { room_total_usd: 800 }, error: null },
        maybeSingle: { data: null, error: null },
        insert: { error: null },
        bookings: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { room_total_usd: 800 }, error: null }),
            })),
          })),
        },
        equipment_bookings: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ price_usd: 50 }], error: null }),
            })),
          })),
        },
        airport_transfers: {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ price_usd: 30 }], error: null }),
          })),
        },
        booking_charges: {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ line_total_usd: 20 }], error: null }),
          })),
        },
        settings: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { surcharge_pct: 10 }, error: null }),
            })),
          })),
        },
        invoices: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn(() => ({ eq: vi.fn() })),
        },
      }),
    })
    const result = await generateInvoice("b-1")
    expect("data" in result).toBe(true)
    if ("data" in result) {
      expect(result.data.roomTotal).toBe(800)
      expect(result.data.surchargePct).toBe(10)
    }
  })

  it("updates existing invoice", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({
        single: { data: { room_total_usd: 800 }, error: null },
        maybeSingle: { data: { id: "inv-1" }, error: null },
        invoices: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "inv-1" }, error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        },
        settings: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { surcharge_pct: 10 }, error: null }),
            })),
          })),
        },
      }),
    })
    const result = await generateInvoice("b-1")
    expect("data" in result).toBe(true)
  })
})

describe("getInvoice", () => {
  it("returns invoice", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({ maybeSingle: { data: { id: "inv-1", grand_total_usd: 1000 }, error: null } }),
    })
    const result = await getInvoice("b-1")
    expect("data" in result).toBe(true)
  })
})

describe("recordPayment", () => {
  it("records cash payment", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({ insert: { error: null } }),
    })
    const result = await recordPayment("b-1", { amount_usd: 500, method: "cash" })
    expect("data" in result).toBe(true)
  })

  it("records card payment with invoice", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const updateMock = vi.fn().mockResolvedValue({ error: null })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({
        insert: { error: null },
        invoices: { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) },
      }),
    })
    const result = await recordPayment("b-1", { amount_usd: 500, method: "card_payhere", invoice_id: "inv-1" })
    expect("data" in result).toBe(true)
  })

  it("fails validation for zero amount", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    const result = await recordPayment("b-1", { amount_usd: 0, method: "cash" })
    expect("error" in result).toBe(true)
  })
})

describe("confirmBankTransfer", () => {
  it("confirms bank transfer", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({
        maybeSingle: { data: { id: "pay-1" }, error: null },
        update: { error: null },
        payments: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: "pay-1" }, error: null }),
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        },
        bookings: {
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        },
      }),
    })
    const result = await confirmBankTransfer("b-1")
    expect("data" in result).toBe(true)
  })

  it("works when no pending payment", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: mockFrom({
        maybeSingle: { data: null, error: null },
        update: { error: null },
        bookings: {
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        },
      }),
    })
    const result = await confirmBankTransfer("b-1")
    expect("data" in result).toBe(true)
  })
})
