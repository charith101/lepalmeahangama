import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/payhere/return/route"

describe("GET /api/payhere/return", () => {
  it("redirects to /booking when booking_id is missing", async () => {
    const request = new NextRequest("https://example.com/api/payhere/return")
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toMatch(/\/booking$/)
  })

  it("redirects to confirmation page when booking_id is present", async () => {
    const request = new NextRequest("https://example.com/api/payhere/return?booking_id=booking-123")
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/booking/confirmation/booking-123")
  })
})
