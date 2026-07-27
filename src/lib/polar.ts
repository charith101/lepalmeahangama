import { Polar } from "@polar-sh/sdk"
import { APP_URL } from "@/lib/constants"

export function getPolarClient() {
  return new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
  })
}

export async function createCheckoutSession(params: {
  bookingId: string
  groupBookingId: string
  amount: number
  customerEmail?: string
  customerName?: string
}) {
  const polar = getPolarClient()

  const checkout = await polar.checkouts.create({
    products: [process.env.POLAR_PRODUCT_ID ?? ""],
    amount: Math.round(params.amount * 100),
    successUrl: `${APP_URL}/api/polar/success?checkout_id={CHECKOUT_ID}`,
    customerEmail: params.customerEmail || undefined,
    customerName: params.customerName || undefined,
    metadata: {
      booking_id: params.bookingId,
      group_booking_id: params.groupBookingId,
    },
  })

  return checkout
}
