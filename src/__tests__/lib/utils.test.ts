import { describe, it, expect } from "vitest"
import { cn, formatCurrency, roundTo } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
  })

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe("base visible")
  })

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("")
  })
})

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(100)).toBe("$100.00")
  })

  it("formats with cents", () => {
    expect(formatCurrency(99.95)).toBe("$99.95")
  })

  it("formats thousands with commas", () => {
    expect(formatCurrency(1500)).toBe("$1,500.00")
  })

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00")
  })

  it("handles NaN", () => {
    expect(formatCurrency(NaN)).toBe("$NaN")
  })
})

describe("roundTo", () => {
  it("rounds to 2 decimals by default", () => {
    expect(roundTo(10.005)).toBe(10.01)
  })

  it("rounds to specified decimals", () => {
    expect(roundTo(10.1234, 3)).toBe(10.123)
  })

  it("handles rounding up", () => {
    expect(roundTo(1.005, 2)).toBe(1.01)
  })

  it("handles integers", () => {
    expect(roundTo(42, 2)).toBe(42)
  })

  it("handles zero", () => {
    expect(roundTo(0, 2)).toBe(0)
  })
})
