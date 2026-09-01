"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { guestSchema } from "@/lib/validations"
import { requireStaff } from "@/lib/auth"
import { refundPayherePayment } from "@/lib/payhere-refund"
import { BOARD_PLANS, BOARD_PRICE_PER_NIGHT, type BoardPlan } from "@/lib/constants"

async function validateAndComputeRoomTotal(roomId: string, checkIn: string, checkOut: string): Promise<number | string> {
  const supabase = createAdminClient()
  const { data: room } = await supabase
    .from("rooms").select("category_id").eq("id", roomId).single()
  if (!room) return "Room not found"
  const { data: category } = await supabase
    .from("room_categories").select("base_price_usd").eq("id", room.category_id).single()
  if (!category) return "Room category not found"
  const nights = Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ))
  return Number(category.base_price_usd) * nights
}

export async function createBooking(data: {
  guest_id?: string
  guest?: { full_name: string; email?: string; phone?: string; nationality?: string; nic_or_passport?: string }
  room_id: string
  check_in: string
  check_out: string
  status: "pending_payment" | "confirmed"
  source: "website" | "walk_in" | "ota_manual"
  ota_name?: string
  num_guests?: number
  room_total_usd?: number
  notes?: string
  equipment?: Array<{ unit_id: string; start_date: string; end_date: string; price_usd?: number }>
  transfer?: { route_id: string; direction: "arrival" | "departure"; flight_number?: string; transfer_datetime: string; price_usd?: number }
  group_booking_id?: string
}) {
  const supabase = createAdminClient()

  const validatedRoomTotal = await validateAndComputeRoomTotal(data.room_id, data.check_in, data.check_out)
  if (typeof validatedRoomTotal === "string") return { error: validatedRoomTotal }

  let guestId = data.guest_id
  if (!guestId && data.guest) {
    const { data: guest, error: guestErr } = await supabase
      .from("guests").insert(data.guest).select().single()
    if (guestErr) return { error: guestErr.message }
    guestId = guest.id
  }
  if (!guestId) return { error: "Guest ID or guest data required" }

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      guest_id: guestId,
      room_id: data.room_id,
      check_in: data.check_in,
      check_out: data.check_out,
      status: data.status,
      source: data.source,
      ota_name: data.ota_name,
      num_guests: data.num_guests,
      room_total_usd: validatedRoomTotal,
      notes: data.notes,
      group_booking_id: data.group_booking_id,
    })
    .select()
    .single()

  if (bookingErr) return { error: bookingErr.message }

  for (const eq of data.equipment || []) {
    await supabase.from("equipment_bookings").insert({
      unit_id: eq.unit_id,
      guest_id: guestId,
      booking_id: booking.id,
      start_date: eq.start_date,
      end_date: eq.end_date,
      price_usd: eq.price_usd ?? 0,
      status: data.status === "pending_payment" ? "pending" : "active",
    })
  }

  if (data.transfer) {
    await supabase.from("airport_transfers").insert({
      route_id: data.transfer.route_id,
      booking_id: booking.id,
      guest_id: guestId,
      direction: data.transfer.direction,
      flight_number: data.transfer.flight_number,
      transfer_datetime: data.transfer.transfer_datetime,
      price_usd: data.transfer.price_usd ?? 0,
      status: "scheduled",
    })
  }

  return { data: { booking } }
}

export async function createPayHereBooking(data: {
  guest: { full_name: string; email?: string; phone?: string; nationality?: string; nic_or_passport?: string }
  roomSelections: Array<{
    room_id: string
    check_in: string
    check_out: string
    room_total_usd?: number
    num_guests?: number
  }>
  board_plan?: string
  grand_total_usd?: number
  equipment?: Array<{ unit_id: string; start_date: string; end_date: string; price_usd?: number }>
  transfer?: { route_id: string; direction: "arrival" | "departure"; flight_number?: string; transfer_datetime: string; price_usd?: number }
  }) {
  if (process.env.NEXT_PUBLIC_BOOKING_ENABLED === "false") {
    return { error: "Online booking is temporarily unavailable. Please contact us directly." }
  }

  const boardPlan = BOARD_PLANS.some((p) => p.key === data.board_plan)
    ? (data.board_plan as BoardPlan)
    : "room_only"
  const boardPricePerNight = BOARD_PRICE_PER_NIGHT(boardPlan)
  const guestResult = guestSchema.safeParse({
    fullName: data.guest.full_name,
    email: data.guest.email ?? "",
    phone: data.guest.phone ?? "",
    nationality: data.guest.nationality ?? "",
    nic_passport: data.guest.nic_or_passport ?? "",
  })
  if (!guestResult.success) {
    return { error: guestResult.error.issues.map((i) => i.message).join("; ") }
  }

  for (const sel of data.roomSelections) {
    const validated = await validateAndComputeRoomTotal(sel.room_id, sel.check_in, sel.check_out)
    if (typeof validated === "string") return { error: validated }
  }

  const supabase = createAdminClient()

  const { data: guest, error: guestErr } = await supabase
    .from("guests").insert(data.guest).select().single()
  if (guestErr) return { error: guestErr.message }

  const groupBookingId = crypto.randomUUID()
  const bookingIds: string[] = []

  for (const sel of data.roomSelections) {
    const roomTotal = await validateAndComputeRoomTotal(sel.room_id, sel.check_in, sel.check_out)
    if (typeof roomTotal === "string") {
      await supabase.from("guests").delete().eq("id", guest.id)
      return { error: roomTotal }
    }

    const nights = Math.max(1, Math.round(
      (new Date(sel.check_out).getTime() - new Date(sel.check_in).getTime()) / (1000 * 60 * 60 * 24)
    ))

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        guest_id: guest.id,
        room_id: sel.room_id,
        check_in: sel.check_in,
        check_out: sel.check_out,
        status: "pending_payment",
        source: "website",
        num_guests: sel.num_guests,
        room_total_usd: roomTotal,
        board_plan: boardPlan,
        board_total_usd: boardPricePerNight * nights,
        group_booking_id: groupBookingId,
      })
      .select()
      .single()

    if (bookingErr) {
      await supabase.from("guests").delete().eq("id", guest.id)
      return { error: bookingErr.message }
    }
    bookingIds.push(booking.id)
  }

  for (const eq of data.equipment || []) {
    await supabase.from("equipment_bookings").insert({
      unit_id: eq.unit_id,
      guest_id: guest.id,
      booking_id: bookingIds[0],
      start_date: eq.start_date,
      end_date: eq.end_date,
      price_usd: eq.price_usd ?? 0,
      status: "pending",
    })
  }

  if (data.transfer) {
    await supabase.from("airport_transfers").insert({
      route_id: data.transfer.route_id,
      booking_id: bookingIds[0],
      guest_id: guest.id,
      direction: data.transfer.direction,
      flight_number: data.transfer.flight_number,
      transfer_datetime: data.transfer.transfer_datetime,
      price_usd: data.transfer.price_usd ?? 0,
      status: "scheduled",
    })
  }

  revalidatePath("/dashboard/calendar")
  return { data: { bookingIds, groupBookingId, grandTotal: data.grand_total_usd ?? 0 } }
}

export async function getBooking(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("bookings")
    .select("*, guests(*), rooms(*, room_categories(*))")
    .eq("id", id)
    .single()
  if (error) return { error: error.message }
  return { data }
}

export async function getBookingsByGroup(groupBookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("bookings")
    .select("*, guests(*), rooms(*, room_categories(*))")
    .eq("group_booking_id", groupBookingId)
  if (error) return { error: error.message }
  return { data }
}

export async function checkIn(id: string, nicPassport: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  if (nicPassport && nicPassport.length > 100) return { error: "NIC/Passport must be 100 characters or less" }
  const supabase = await createServerClient()
  const { error: bookingErr } = await supabase
    .from("bookings").update({ status: "checked_in" }).eq("id", id)
  if (bookingErr) return { error: bookingErr.message }

  const { data: booking } = await supabase.from("bookings").select("guest_id").eq("id", id).single()
  if (booking?.guest_id) {
    const { error: guestErr } = await supabase
      .from("guests").update({ nic_or_passport: nicPassport }).eq("id", booking.guest_id)
    if (guestErr) return { error: guestErr.message }
  }

  revalidatePath(`/dashboard/bookings/${id}`)
  return { data: null }
}

export async function checkOut(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("bookings").update({ status: "checked_out" }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${id}`)
  return { data: null }
}

export async function cancelBooking(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings").select("status").eq("id", id).single()
  if (!booking) return { error: "Booking not found" }

  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/bookings/${id}`)
  return { data: null }
}

export async function updateBookingStatus(id: string, status: Database["public"]["Enums"]["booking_status"]) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${id}`)
  return { data: null }
}

export async function getTodayArrivals() {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const now = new Date()
  const colomboOffset = 5.5 * 60 * 60 * 1000
  const colomboDate = new Date(now.getTime() + colomboOffset)
  const today = colomboDate.toISOString().split("T")[0]
  const { data, error } = await supabase
    .from("bookings")
    .select("*, rooms(room_number), guests(full_name)")
    .eq("check_in", today)
    .eq("status", "confirmed")
  if (error) return { error: error.message }
  return { data }
}

export async function getTodayDepartures() {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const now = new Date()
  const colomboOffset = 5.5 * 60 * 60 * 1000
  const colomboDate = new Date(now.getTime() + colomboOffset)
  const today = colomboDate.toISOString().split("T")[0]
  const { data, error } = await supabase
    .from("bookings")
    .select("*, rooms(room_number), guests(full_name)")
    .eq("check_out", today)
    .eq("status", "checked_in")
  if (error) return { error: error.message }
  return { data }
}

export type BookingLookupResult = {
  id: string
  check_in: string
  check_out: string
  created_at: string
  guest_full_name: string
  guest_email: string
  guest_phone: string | null
  guest_nationality: string | null
  guest_nic_or_passport: string | null
  room_number: string
  room_category_name: string
  room_total_usd: number | null
  status: string
  source: string
  notes: string | null
  num_guests: number | null
  group_booking_id: string
}

export async function lookupBookingByRef(refCode: string, email: string) {
  const supabase = await createServerClient()
  const refUpper = refCode.toUpperCase().trim()

  const { data, error } = await supabase
    .rpc("lookup_booking_by_ref", { p_ref: refUpper, p_email: email.toLowerCase() })

  if (error) return { error: error.message }

  if (!data || data.length === 0) {
    return { error: "Booking not found or email does not match. Please check your details." }
  }

  return { data: data as BookingLookupResult[] }
}

export async function recordDeposit(bookingId: string, amount: number) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  if (amount <= 0) return { error: "Amount must be positive" }

  const supabase = await createServerClient()
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount_usd: amount,
    method: "cash",
    status: "completed",
    paid_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}

export async function lookupBookingByGroupId(groupBookingId: string, email: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("bookings")
    .select("*, guests(*), rooms(*, room_categories(*)), equipment_bookings(*, equipment_units(*, equipment_categories(*))), airport_transfers(*)")
    .eq("group_booking_id", groupBookingId)

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: "Booking not found" }

  const guest = data[0].guests as { email: string | null } | null
  if (!guest?.email || guest.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "Email does not match" }
  }

  return { data }
}

export async function refundBookingPayment(bookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }

  const supabase = await createServerClient()

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, method, status, payhere_payment_id, amount_usd")
    .eq("booking_id", bookingId)
    .eq("method", "card_payhere")
    .eq("status", "completed")
    .single()

  if (payErr || !payment) return { error: "No completed PayHere payment found for this booking" }
  if (payment.status === "refunded") return { error: "Payment already refunded" }
  if (!payment.payhere_payment_id) return { error: "PayHere payment ID missing — refund manually via PayHere dashboard" }

  const result = await refundPayherePayment(payment.payhere_payment_id, "Booking cancelled")
  if (!result.success) return { error: `PayHere refund failed: ${result.error}` }

  const { error: updateErr } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id)
  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}
