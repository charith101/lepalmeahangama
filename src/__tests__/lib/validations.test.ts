import { describe, it, expect } from "vitest"
import {
  guestSchema, dateStepSchema, extrasSchema, bookingLookupSchema,
  loginSchema, dashboardBookingSchema, chargeSchema, equipmentRentalSchema,
  transferSchema, recordPaymentSchema, settingsSchema, addUnitSchema, pricingUpdateSchema,
} from "@/lib/validations"

describe("guestSchema", () => {
  const valid = { fullName: "John Doe", email: "john@example.com", phone: "+94 77 123 4567", nationality: "British", nic_passport: "AB123456" }

  it("passes valid input", () => {
    expect(guestSchema.safeParse(valid).success).toBe(true)
  })

  it("fails on empty name", () => {
    const r = guestSchema.safeParse({ ...valid, fullName: "" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toContain("fullName")
  })

  it("fails on bad email", () => {
    const r = guestSchema.safeParse({ ...valid, email: "notanemail" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toContain("email")
  })

  it("fails on phone with special chars only", () => {
    const r = guestSchema.safeParse({ ...valid, phone: "abc" })
    expect(r.success).toBe(false)
  })

  it("fails on nationality with numbers", () => {
    const r = guestSchema.safeParse({ ...valid, nationality: "British123" })
    expect(r.success).toBe(false)
  })

  it("fails on short NIC/Passport", () => {
    const r = guestSchema.safeParse({ ...valid, nic_passport: "AB" })
    expect(r.success).toBe(false)
  })
})

describe("dateStepSchema", () => {
  const valid = { checkIn: "2026-08-01", checkOut: "2026-08-05", roomSelections: [{ categoryId: crypto.randomUUID(), categoryName: "Deluxe", basePrice: 200, maxOccupancy: 2, quantity: 1, availableCount: 3, imageUrl: null }] }

  it("passes valid input", () => {
    expect(dateStepSchema.safeParse(valid).success).toBe(true)
  })

  it("fails when checkout before checkin", () => {
    const r = dateStepSchema.safeParse({ ...valid, checkIn: "2026-08-10", checkOut: "2026-08-05" })
    expect(r.success).toBe(false)
  })

  it("fails on empty room selections", () => {
    const r = dateStepSchema.safeParse({ ...valid, roomSelections: [] })
    expect(r.success).toBe(false)
  })

  it("fails on zero quantity", () => {
    const r = dateStepSchema.safeParse({ ...valid, roomSelections: [{ ...valid.roomSelections[0], quantity: 0 }] })
    expect(r.success).toBe(false)
  })
})

describe("extrasSchema", () => {
  const valid = { surfboardQty: 0, bicycleQty: 0, equipmentStart: "2026-08-01", equipmentEnd: "2026-08-05", transferNeeded: false, transferDirection: "arrival", flightNumber: "", transferTime: "" }

  it("passes valid input without extras", () => {
    expect(extrasSchema.safeParse(valid).success).toBe(true)
  })

  it("fails on negative qty", () => {
    const r = extrasSchema.safeParse({ ...valid, surfboardQty: -1 })
    expect(r.success).toBe(false)
  })

  it("fails when equipment end < start", () => {
    const r = extrasSchema.safeParse({ ...valid, surfboardQty: 1, equipmentStart: "2026-08-10", equipmentEnd: "2026-08-05" })
    expect(r.success).toBe(false)
  })

  it("fails when transfer needed without time", () => {
    const r = extrasSchema.safeParse({ ...valid, transferNeeded: true, transferDirection: "arrival", flightNumber: "BA123", transferTime: "" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path.includes("transferTime"))).toBe(true)
  })
})

describe("bookingLookupSchema", () => {
  it("passes valid input", () => {
    expect(bookingLookupSchema.safeParse({ referenceCode: "BOOK-123", email: "a@b.com" }).success).toBe(true)
  })

  it("fails empty reference", () => {
    expect(bookingLookupSchema.safeParse({ referenceCode: "", email: "a@b.com" }).success).toBe(false)
  })

  it("fails bad email", () => {
    expect(bookingLookupSchema.safeParse({ referenceCode: "BOOK-123", email: "bad" }).success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("passes valid input", () => {
    expect(loginSchema.safeParse({ email: "admin@lepalme.com", password: "password123" }).success).toBe(true)
  })

  it("fails short password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "12345" }).success).toBe(false)
  })

  it("fails bad email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "123456" }).success).toBe(false)
  })
})

describe("dashboardBookingSchema", () => {
  const valid = { checkIn: new Date("2026-08-01"), checkOut: new Date("2026-08-05"), roomId: "room-1", source: "walk_in" as const, otaName: "", guestName: "Jane", guestEmail: "", guestPhone: "", notes: "" }

  it("passes valid input", () => {
    expect(dashboardBookingSchema.safeParse(valid).success).toBe(true)
  })

  it("fails checkout before checkin", () => {
    const r = dashboardBookingSchema.safeParse({ ...valid, checkIn: new Date("2026-08-10"), checkOut: new Date("2026-08-05") })
    expect(r.success).toBe(false)
  })

  it("requires otaName for OTA bookings", () => {
    const r = dashboardBookingSchema.safeParse({ ...valid, source: "ota_manual", otaName: "" })
    expect(r.success).toBe(false)
  })
})

describe("chargeSchema", () => {
  it("passes valid input", () => {
    expect(chargeSchema.safeParse({ description: "Meal", category: "meal", quantity: 2, unitPrice: 25 }).success).toBe(true)
  })

  it("fails negative quantity", () => {
    expect(chargeSchema.safeParse({ description: "Meal", category: "meal", quantity: -1, unitPrice: 25 }).success).toBe(false)
  })

  it("fails zero unit price", () => {
    expect(chargeSchema.safeParse({ description: "Meal", category: "meal", quantity: 1, unitPrice: 0 }).success).toBe(false)
  })
})

describe("equipmentRentalSchema", () => {
  it("passes valid input", () => {
    expect(equipmentRentalSchema.safeParse({ categoryId: "cat-1", unitId: "unit-1", guestId: "guest-1", startDate: "2026-08-01", endDate: "2026-08-03" }).success).toBe(true)
  })

  it("fails end before start", () => {
    expect(equipmentRentalSchema.safeParse({ categoryId: "cat-1", unitId: "unit-1", guestId: "guest-1", startDate: "2026-08-10", endDate: "2026-08-05" }).success).toBe(false)
  })
})

describe("transferSchema", () => {
  it("passes valid input", () => {
    expect(transferSchema.safeParse({ routeId: "route-1", guestId: "guest-1", direction: "arrival", flightNumber: "BA123", datetime: "2026-08-01T10:00" }).success).toBe(true)
  })
})

describe("recordPaymentSchema", () => {
  it("passes valid input", () => {
    expect(recordPaymentSchema.safeParse({ amount: 100, method: "cash" }).success).toBe(true)
  })

  it("fails zero amount", () => {
    expect(recordPaymentSchema.safeParse({ amount: 0, method: "cash" }).success).toBe(false)
  })
})

describe("settingsSchema", () => {
  it("passes valid input", () => {
    expect(settingsSchema.safeParse({ checkInTime: "14:00", checkOutTime: "11:00", surchargePct: 10, minDepositPct: 20 }).success).toBe(true)
  })

  it("fails surcharge over 100", () => {
    expect(settingsSchema.safeParse({ checkInTime: "14:00", checkOutTime: "11:00", surchargePct: 150, minDepositPct: 20 }).success).toBe(false)
  })
})

describe("addUnitSchema", () => {
  it("passes valid input", () => {
    expect(addUnitSchema.safeParse({ unitLabel: "Surfboard 1", categoryId: "cat-1" }).success).toBe(true)
  })

  it("fails empty label", () => {
    expect(addUnitSchema.safeParse({ unitLabel: "", categoryId: "cat-1" }).success).toBe(false)
  })
})

describe("pricingUpdateSchema", () => {
  it("passes valid input", () => {
    expect(pricingUpdateSchema.safeParse({ basePriceUsd: 250 }).success).toBe(true)
  })

  it("fails negative price", () => {
    expect(pricingUpdateSchema.safeParse({ basePriceUsd: -10 }).success).toBe(false)
  })
})
