import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { addShiftNote, deleteShiftNote, getShiftNotes } from "@/lib/actions/shiftnotes"

beforeEach(() => { vi.clearAllMocks() })

describe("addShiftNote", () => {
  it("adds a note", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    })
    const result = await addShiftNote("Room 201 needs towels")
    expect("data" in result).toBe(true)
  })

  it("rejects empty content", async () => {
    const result = await addShiftNote("")
    expect("error" in result).toBe(true)
  })

  it("rejects content over 500 chars", async () => {
    const result = await addShiftNote("x".repeat(501))
    expect("error" in result).toBe(true)
  })
})

describe("deleteShiftNote", () => {
  it("deletes a note", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    })
    const result = await deleteShiftNote("note-1")
    expect("data" in result).toBe(true)
  })
})

describe("getShiftNotes", () => {
  it("returns notes", async () => {
    ;(requireStaff as any).mockResolvedValue({ user: { id: "s1", role: "admin" } })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [{ id: "n-1", content: "Test" }], error: null }),
          })),
        })),
      })),
    })
    const result = await getShiftNotes()
    expect("data" in result).toBe(true)
  })
})
