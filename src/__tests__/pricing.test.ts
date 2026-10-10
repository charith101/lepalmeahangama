import { describe, expect, it } from "vitest"
import {
  BOARD_PLANS, BOARD_PRICE_PER_NIGHT, BOARD_LABEL,
  SURFBOARD_TIERS, surfboardTotalForDays,
  MOTORBIKE_CATEGORIES, CAR_CATEGORIES,
} from "@/lib/constants"
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

  it("extra schema accepts separate rental ranges for surfboards", () => {
    const result = extrasSchema.safeParse({
      surfboardQty: 2,
      surfboardStart: "2026-09-01", surfboardEnd: "2026-09-04",
      items: [],
      transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "",
    })
    expect(result.success).toBe(true)
  })

  it("accepts motorbike and car items with their own date ranges", () => {
    const result = extrasSchema.safeParse({
      surfboardQty: 0,
      surfboardStart: "", surfboardEnd: "",
      items: [
        { categoryId: MOTORBIKE_CATEGORIES.tvs_ntorq, qty: 1, start: "2026-09-01", end: "2026-09-04" },
        { categoryId: CAR_CATEGORIES.aqua, qty: 2, start: "2026-09-01", end: "2026-09-03" },
      ],
      transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an item with an end date before its start", () => {
    const result = extrasSchema.safeParse({
      surfboardQty: 0,
      surfboardStart: "", surfboardEnd: "",
      items: [
        { categoryId: CAR_CATEGORIES.aqua, qty: 1, start: "2026-09-04", end: "2026-09-02" },
      ],
      transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("rentalDays", () => {
  it("counts days between dates", () => {
    expect(rentalDays("2026-09-01", "2026-09-04")).toBe(3)
  })
  it("counts a same-day rental as 1 day", () => {
    expect(rentalDays("2026-09-04", "2026-09-04")).toBe(1)
  })
  it("returns 0 when end precedes start", () => {
    expect(rentalDays("2026-09-04", "2026-09-02")).toBe(0)
  })
  it("falls back when dates are missing or invalid", () => {
    expect(rentalDays("", "", 4)).toBe(4)
    expect(rentalDays("bogus", "2026-09-04", 2)).toBe(2)
  })
})

describe("surfboardTotalForDays", () => {
  it("uses tier 1 ($25/day) for 1–6 days", () => {
    expect(surfboardTotalForDays(1, 999, SURFBOARD_TIERS)).toBe(25)
    expect(surfboardTotalForDays(6, 999, SURFBOARD_TIERS)).toBe(150)
  })
  it("uses tier 2 ($14/day) for 7–13 days", () => {
    expect(surfboardTotalForDays(7, 999, SURFBOARD_TIERS)).toBe(98)
    expect(surfboardTotalForDays(13, 999, SURFBOARD_TIERS)).toBe(182)
  })
  it("uses tier 3 ($12/day) for 14–20 days", () => {
    expect(surfboardTotalForDays(14, 999, SURFBOARD_TIERS)).toBe(168)
    expect(surfboardTotalForDays(20, 999, SURFBOARD_TIERS)).toBe(240)
  })
  it("uses tier 4 ($11/day) for 21+ days", () => {
    expect(surfboardTotalForDays(21, 999, SURFBOARD_TIERS)).toBe(231)
    expect(surfboardTotalForDays(30, 999, SURFBOARD_TIERS)).toBe(330)
  })
  it("returns 0 for 0 or negative days", () => {
    expect(surfboardTotalForDays(0, 999, SURFBOARD_TIERS)).toBe(0)
    expect(surfboardTotalForDays(-3, 999, SURFBOARD_TIERS)).toBe(0)
  })
  it("falls back to a flat per-day rate when tiered pricing is missing", () => {
    expect(surfboardTotalForDays(5, 15, null)).toBe(75)
    expect(surfboardTotalForDays(10, 15, undefined)).toBe(150)
  })
})
