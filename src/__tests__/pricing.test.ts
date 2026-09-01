import { describe, expect, it } from "vitest"
import { BOARD_PLANS, BOARD_PRICE_PER_NIGHT, BOARD_LABEL } from "@/lib/constants"
import { rentalDays } from "@/lib/utils"
import { boardPlanSchema, extrasSchema } from "@/lib/validations"

describe("board plans", () => {
  it("resolve per-night pricing from constants", () => {
    expect(BOARD_PLANS.find((p) => p.key === "room_only")?.pricePerNight).toBe(0)
    expect(BOARD_PRICE_PER_NIGHT("half_board")).toBe(10)
    expect(BOARD_PRICE_PER_NIGHT("full_board")).toBe(20)
    expect(BOARD_PRICE_PER_NIGHT("unknown")).toBe(0)
    expect(BOARD_LABEL("half_board")).toBe("Half Board")
  })

  it("validates board plan on the server", () => {
    expect(boardPlanSchema.parse("full_board")).toBe("full_board")
    expect(boardPlanSchema.safeParse("all_inclusive").success).toBe(false)
  })

  it("extra schema accepts separate rental ranges for boards and bikes", () => {
    const result = extrasSchema.safeParse({
      surfboardQty: 2, bicycleQty: 1,
      surfboardStart: "2026-09-01", surfboardEnd: "2026-09-04",
      bicycleStart: "2026-09-02", bicycleEnd: "2026-09-03",
      transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a bike range that ends before it starts", () => {
    const result = extrasSchema.safeParse({
      surfboardQty: 0, bicycleQty: 1,
      surfboardStart: "", surfboardEnd: "",
      bicycleStart: "2026-09-04", bicycleEnd: "2026-09-02",
      transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "bicycleEnd")).toBe(true)
    }
  })
})

describe("rentalDays", () => {
  it("counts days between dates", () => {
    expect(rentalDays("2026-09-01", "2026-09-04")).toBe(3)
  })
  it("falls back when dates are missing or invalid", () => {
    expect(rentalDays("", "", 4)).toBe(4)
    expect(rentalDays("bogus", "2026-09-04", 2)).toBe(2)
  })
})