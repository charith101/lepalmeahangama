import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCurrency } from "@/lib/utils"
import { BOARD_LABEL } from "@/lib/constants"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendBookingConfirmation(bookingId: string) {
  const supabase = createAdminClient()

  const { data: booking, error: queryErr } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, room_total_usd, board_plan, board_total_usd, group_booking_id, rooms!inner(room_number, room_categories!inner(name)), guests!inner(full_name, email), equipment_bookings(equipment_units(equipment_categories(name)), start_date, end_date), airport_transfers(direction, flight_number, transfer_datetime)")
    .eq("id", bookingId)
    .single()

  if (queryErr || !booking) {
    console.error("[email] Failed to fetch booking for confirmation email", { bookingId, error: queryErr })
    return
  }

  if (!booking?.guests?.email) {
    console.warn("[email] No guest email found for booking", { bookingId })
    return
  }

  const g = booking.guests as unknown as { full_name: string; email: string }
  const r = booking.rooms as unknown as { room_number: string; room_categories: { name: string } }
  const rentals = (booking.equipment_bookings ?? []) as unknown as Array<{
    start_date: string
    end_date: string
    equipment_units: { equipment_categories: { name: string } }
  }>
  const transfers = (booking.airport_transfers ?? []) as unknown as Array<{
    direction: string
    flight_number: string | null
    transfer_datetime: string
  }>
  const ref = (booking.group_booking_id ?? booking.id).slice(0, 8).toUpperCase()

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
  <tr><td style="padding:8px 0;color:#666">Room</td><td style="padding:8px 0">${r.room_number} — ${r.room_categories.name}</td></tr>
  <tr><td style="padding:8px 0;color:#666">Check-in</td><td style="padding:8px 0">${booking.check_in}</td></tr>
  <tr><td style="padding:8px 0;color:#666">Check-out</td><td style="padding:8px 0">${booking.check_out}</td></tr>
  <tr><td style="padding:8px 0;color:#666">Board plan</td><td style="padding:8px 0">${BOARD_LABEL(booking.board_plan)}${Number(booking.board_total_usd) > 0 ? ` (${formatCurrency(Number(booking.board_total_usd))})` : ""}</td></tr>
  ${rentals.map((eq) => `<tr><td style="padding:8px 0;color:#666">${eq.equipment_units?.equipment_categories?.name ?? "Equipment"}</td><td style="padding:8px 0">${eq.start_date} — ${eq.end_date}</td></tr>`).join("")}
  ${transfers.map((t) => `<tr><td style="padding:8px 0;color:#666">Transfer (${t.direction})</td><td style="padding:8px 0">${t.transfer_datetime}${t.flight_number ? ` — ${t.flight_number}` : ""}</td></tr>`).join("")}
  <tr><td style="padding:8px 0;color:#666">Total</td><td style="padding:8px 0;font-weight:500">${formatCurrency(Number(booking.room_total_usd ?? 0) + Number(booking.board_total_usd ?? 0))}</td></tr>
  </table>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}" style="display:inline-block;margin-top:24px;padding:10px 24px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-size:14px">Visit our website</a>
  <p style="margin-top:32px;color:#999;font-size:12px">Le Palme Ahangama — Ahangama, Sri Lanka</p>
  </div>`,
    })
    console.log("[email] Confirmation sent", { bookingId, to: g.email })
  } catch (err) {
    console.error("[email] Failed to send confirmation email", { bookingId, to: g.email, error: err instanceof Error ? err.message : String(err) })
  }
}
