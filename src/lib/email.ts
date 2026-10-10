import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeBookingTotal } from "@/lib/booking-pricing"
import { formatCurrency } from "@/lib/utils"
import { BOARD_LABEL, HOTEL_ADDRESS_FULL, HOTEL_NAME, HOTEL_PHONE_DISPLAY, HOTEL_EMAIL } from "@/lib/constants"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendBookingConfirmation(bookingId: string) {
  const supabase = createAdminClient()

  // The email covers the whole group (one row per room). Resolve the group
  // from the triggering booking so multi-room bookings email all rooms.
  const { data: seed } = await supabase
    .from("bookings")
    .select("group_booking_id")
    .eq("id", bookingId)
    .single()
  const groupBookingId = seed?.group_booking_id ?? bookingId

  const { data: bookings, error: queryErr } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, room_total_usd, board_plan, board_total_usd, rooms!inner(room_number, room_categories!inner(name)), guests!inner(full_name, email), equipment_bookings(price_usd, start_date, end_date, equipment_units(equipment_categories(name))), airport_transfers(direction, flight_number, transfer_datetime, price_usd)")
    .eq("group_booking_id", groupBookingId)
    .order("check_in")

  if (queryErr || !bookings?.length) {
    console.error("[email] Failed to fetch booking group for confirmation email", { bookingId, groupBookingId, error: queryErr })
    return
  }

  const first = bookings[0]
  if (!first?.guests?.email) {
    console.warn("[email] No guest email found for booking", { bookingId, groupBookingId })
    return
  }

  type RoomRow = { room_number: string; room_categories: { name: string } }
  type RentalRow = { start_date: string; end_date: string; price_usd: number | null; equipment_units: { equipment_categories: { name: string } } }
  type TransferRow = { direction: string; flight_number: string | null; transfer_datetime: string; price_usd: number | null }

  const g = first.guests as unknown as { full_name: string; email: string }
  const rooms = bookings.map((b) => b.rooms as unknown as RoomRow)
  const roomSubtotal = bookings.reduce((s, b) => s + Number(b.room_total_usd ?? 0), 0)
  const boardTotal = Number(first.board_total_usd ?? 0)
  const rentals = bookings.flatMap(
    (b) => (b.equipment_bookings ?? []) as unknown as RentalRow[]
  )
  const transfers = bookings.flatMap(
    (b) => (b.airport_transfers ?? []) as unknown as TransferRow[]
  )
  const ref = (groupBookingId ?? first.id).slice(0, 8).toUpperCase()

  // Server-computed group total — the same figure PayHere charged and the
  // webhook reconciled against (rooms + board + equipment + transfers,
  // then the settings surcharge).
  const totalResult = await computeBookingTotal(groupBookingId)
  const total = "error" in totalResult ? roomSubtotal + boardTotal : totalResult.total

  try {
    await resend.emails.send({
      from: "Le Palme Ahangama <noreply@info.lepalmeahangama.com>",
      to: [g.email],
      subject: "Booking Confirmed — Le Palme Ahangama",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h1 style="font-size:24px;font-weight:300;margin-bottom:24px">Booking Confirmed</h1>
  <p style="color:#666;margin-bottom:24px">Dear ${g.full_name}, your booking at Le Palme Ahangama has been confirmed.</p>
  <table style="width:100%;border-collapse:collapse">
  <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;font-family:monospace">${ref}</td></tr>
  ${rooms.map((r) => `<tr><td style="padding:8px 0;color:#666">Room</td><td style="padding:8px 0">${r.room_number} — ${r.room_categories.name}</td></tr>`).join("")}
  <tr><td style="padding:8px 0;color:#666">Check-in</td><td style="padding:8px 0">${first.check_in}</td></tr>
  <tr><td style="padding:8px 0;color:#666">Check-out</td><td style="padding:8px 0">${first.check_out}</td></tr>
  <tr><td style="padding:8px 0;color:#666">Board plan</td><td style="padding:8px 0">${BOARD_LABEL(first.board_plan)}${boardTotal > 0 ? ` (${formatCurrency(boardTotal)})` : ""}</td></tr>
  ${rentals.map((eq) => `<tr><td style="padding:8px 0;color:#666">${eq.equipment_units?.equipment_categories?.name ?? "Equipment"}</td><td style="padding:8px 0">${eq.start_date} — ${eq.end_date}${eq.price_usd ? ` (${formatCurrency(Number(eq.price_usd))})` : ""}</td></tr>`).join("")}
  ${transfers.map((t) => `<tr><td style="padding:8px 0;color:#666">Transfer (${t.direction})</td><td style="padding:8px 0">${t.transfer_datetime}${t.flight_number ? ` — ${t.flight_number}` : ""}${t.price_usd ? ` (${formatCurrency(Number(t.price_usd))})` : ""}</td></tr>`).join("")}
  <tr><td style="padding:8px 0;color:#666">Total</td><td style="padding:8px 0;font-weight:500">${formatCurrency(total)}</td></tr>
  </table>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}" style="display:inline-block;margin-top:24px;padding:10px 24px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-size:14px">Visit our website</a>
  <p style="margin-top:32px;color:#999;font-size:12px">${HOTEL_NAME} — ${HOTEL_ADDRESS_FULL} · ${HOTEL_PHONE_DISPLAY} · <a href="mailto:${HOTEL_EMAIL}" style="color:#999">${HOTEL_EMAIL}</a></p>
  </div>`,
    })
    console.log("[email] Confirmation sent", { bookingId, groupBookingId, to: g.email })
  } catch (err) {
    console.error("[email] Failed to send confirmation email", { bookingId, groupBookingId, to: g.email, error: err instanceof Error ? err.message : String(err) })
  }
}
