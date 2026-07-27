export function buildGuest(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    full_name: "John Doe",
    email: "john@example.com",
    phone: "+94 77 123 4567",
    nationality: "British",
    nic_or_passport: "AB123456",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildBooking(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    guest_id: crypto.randomUUID(),
    room_id: crypto.randomUUID(),
    check_in: "2026-08-01",
    check_out: "2026-08-05",
    status: "confirmed" as const,
    source: "website" as const,
    room_total_usd: 800,
    num_guests: 2,
    group_booking_id: null,
    ota_name: null,
    notes: null,
    ...overrides,
  }
}

export function buildCharge(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    booking_id: crypto.randomUUID(),
    description: "Room Service",
    category: "meal" as const,
    quantity: 2,
    unit_price_usd: 25,
    line_total_usd: 50,
    ...overrides,
  }
}

export function buildPayment(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    booking_id: crypto.randomUUID(),
    amount_usd: 500,
    method: "cash" as const,
    status: "completed" as const,
    paid_at: new Date().toISOString(),
    ...overrides,
  }
}

export function mockSupabaseChain(returns: Record<string, any>) {
  const chain: any = {
    single: vi.fn().mockResolvedValue(returns.single ?? { data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue(returns.maybeSingle ?? { data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue(returns.rpc ?? { data: [], error: null }),
  }

  chain.then = vi.fn()
  chain.insert.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returns.insert ?? { data: null, error: null }),
  })
  chain.update.mockResolvedValue(returns.update ?? { data: null, error: null })
  chain.delete.mockResolvedValue(returns.delete ?? { data: null, error: null })
  chain.select.mockResolvedValue(returns.select ?? { data: [], error: null })

  return chain
}

export function mockAuthUser(overrides = {}) {
  return {
    user: { id: "staff-1", role: "admin" },
    ...overrides,
  }
}
