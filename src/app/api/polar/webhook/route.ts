import { Webhooks } from "@polar-sh/nextjs"
import { createAdminClient } from "@/lib/supabase/admin"

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onPayload: async (payload: { type: string; data?: Record<string, unknown> }) => {
    if (payload.type !== "order.paid") return

    const data = payload.data as Record<string, unknown> | undefined
    if (!data) return

    const metadata = data.metadata as Record<string, unknown> | undefined
    const groupBookingId = metadata?.group_booking_id as string | undefined
    const bookingId = metadata?.booking_id as string | undefined
    const polarOrderId = data.id as string | undefined
    if (!groupBookingId && !bookingId) return

    const supabase = createAdminClient()

    if (groupBookingId) {
      const { data: bookings } = await supabase
        .from("bookings").update({ status: "confirmed" })
        .eq("group_booking_id", groupBookingId)
        .eq("status", "pending_payment")
        .select("id")

      if (bookings?.length) {
        const amountCents = typeof data.amount === "number" ? data.amount : 0
        await supabase.from("payments").upsert({
          booking_id: bookings[0].id,
          amount_usd: amountCents / 100,
          method: "card_polar",
          status: "completed",
          paid_at: new Date().toISOString(),
          polar_order_id: polarOrderId ?? null,
        }, { onConflict: "booking_id", ignoreDuplicates: true })

        await supabase.from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", bookings[0].id)
          .eq("status", "pending")
      }
    } else if (bookingId) {
      const { data: booking } = await supabase
        .from("bookings").update({ status: "confirmed" })
        .eq("id", bookingId).eq("status", "pending_payment")
        .select("id")
        .single()

      if (booking) {
        const amountCents = typeof data.amount === "number" ? data.amount : 0
        await supabase.from("payments").upsert({
          booking_id: booking.id,
          amount_usd: amountCents / 100,
          method: "card_polar",
          status: "completed",
          paid_at: new Date().toISOString(),
          polar_order_id: polarOrderId ?? null,
        }, { onConflict: "booking_id", ignoreDuplicates: true })

        await supabase.from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", booking.id)
          .eq("status", "pending")
      }
    }
  },
})
