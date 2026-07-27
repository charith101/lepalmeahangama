import "@testing-library/jest-dom/vitest"

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          range: vi.fn(),
          limit: vi.fn(),
          in: vi.fn(),
          maybeSingle: vi.fn(),
          gte: vi.fn(() => ({ lte: vi.fn(() => ({ order: vi.fn() })) })),
        })),
        in: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
        limit: vi.fn(),
        gte: vi.fn(() => ({ lte: vi.fn(() => ({ order: vi.fn() })) })),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn(), in: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn(), in: vi.fn() })),
      rpc: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          range: vi.fn(),
          limit: vi.fn(),
          in: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        in: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
        limit: vi.fn(),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn(), in: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn(), in: vi.fn() })),
      rpc: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    setAll: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/polar", () => ({
  createCheckoutSession: vi.fn(),
  getPolarClient: vi.fn(),
}))

vi.mock("@polar-sh/nextjs", () => ({
  Webhooks: vi.fn(() => vi.fn()),
}))
