"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { guestSchema } from "@/lib/validations"
import { requireStaff } from "@/lib/auth"
import { equipmentItemPrice, transferPrice, computeBookingTotal } from "@/lib/booking-pricing"
import { refundPayherePayment } from "@/lib/payhere-refund"
import { hotelLocalToUtcIso } from "@/lib/datetime"
import { generateInvoice } from "./billing"
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

async function isRoomAvailable(roomId: string, checkIn: string, checkOut: string, supabase: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .in("status", ["pending_payment", "confirmed", "checked_in"])
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .limit(1)
  return !data || data.length === 0
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
  equipment?: Array<{ unit_id: string; start_date: string; end_date: string }>
  transfer?: { route_id: string; direction: "arrival" | "departure"; flight_number?: string; transfer_datetime: string }
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
    const nights = Math.max(1, Math.round(
      (new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / (1000 * 60 * 60 * 24)
    ))
    await supabase.from("equipment_bookings").insert({
      unit_id: eq.unit_id,
      guest_id: guestId,
      booking_id: booking.id,
      start_date: eq.start_date,
      end_date: eq.end_date,
      price_usd: await equipmentItemPrice(eq.unit_id, eq.start_date, eq.end_date, nights),
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
      price_usd: await transferPrice(data.transfer.route_id),
      status: "scheduled",
    })
  }

  return { data: { booking } }
}

export async function createPayHereBooking(data: {
  guest: { full_name: string; email?: string; phone?: string; nationality?: string; nic_or_passport?: string; numGuests?: number }
  roomSelections: Array<{
    room_id: string
    check_in: string
    check_out: string
    num_guests?: number
  }>
  numGuests?: number
  board_plan?: string
  equipment?: Array<{ unit_id: string; start_date: string; end_date: string }>
  transfer?: { route_id: string; direction: "arrival" | "departure"; flight_number?: string; transferTime?: string; transfer_datetime?: string }
  }) {
  if (process.env.NEXT_PUBLIC_BOOKING_ENABLED === "false") {
    return { error: "Online booking is temporarily unavailable. Please contact us directly." }
  }

  const boardPlan = BOARD_PLANS.some((p) => p.key === data.board_plan)
    ? (data.board_plan as BoardPlan)
    : "room_only"
  const boardPricePerNight = BOARD_PRICE_PER_NIGHT(boardPlan)
  // bk01/bk05: the wizard splits the party across rooms (roomSelections[].num_guests);
  // a single party size (payload numGuests or guest.numGuests) applies to all rooms.
  const partyFallback = data.numGuests ?? data.guest.numGuests
  const partySize = partyFallback ??
    data.roomSelections.reduce((sum, r) => sum + (r.num_guests ?? 0), 0)
  const guestResult = guestSchema.safeParse({
    fullName: data.guest.full_name,
    email: data.guest.email ?? "",
    phone: data.guest.phone ?? "",
    nationality: data.guest.nationality ?? "",
    nic_passport: data.guest.nic_or_passport ?? "",
    numGuests: partySize || 1,
  })
  if (!guestResult.success) {
    return { error: guestResult.error.issues.map((i) => i.message).join("; ") }
  }

  // bk02/N5: the server computes the transfer datetime from the raw HH:mm time
  // against the correct stay date — departure transfers use check-out.
  let transferDatetime: string | undefined
  if (data.transfer) {
    if (data.transfer.transferTime) {
      const stay = data.roomSelections[0]
      if (!stay) return { error: "Please select at least one room." }
      const date = data.transfer.direction === "departure" ? stay.check_out : stay.check_in
      transferDatetime = hotelLocalToUtcIso(`${date}T${data.transfer.transferTime}`)
    } else {
      // Legacy client that still posts transfer_datetime — kept for one deploy cycle.
      transferDatetime = data.transfer.transfer_datetime
    }
    if (!transferDatetime) return { error: "Please choose a transfer time." }
  }

  for (const sel of data.roomSelections) {
    const validated = await validateAndComputeRoomTotal(sel.room_id, sel.check_in, sel.check_out)
    if (typeof validated === "string") return { error: validated }
  }

  const supabase = createAdminClient()

  for (const sel of data.roomSelections) {
    const available = await isRoomAvailable(sel.room_id, sel.check_in, sel.check_out, supabase)
    if (!available) {
      return { error: `Room is no longer available for the selected dates. Please go back and choose a different room.` }
    }
  }

  // bk03/N4: re-verify requested equipment/vehicle quantities against live
  // availability — block with an explicit message instead of silently
  // shrinking the order (which made the charged total differ from the display).
  const equipment = data.equipment ?? []
  if (equipment.length) {
    const unitIds = [...new Set(equipment.map((e) => e.unit_id))]
    const { data: unitRows, error: unitErr } = await supabase
      .from("equipment_units")
      .select("id, category_id, equipment_categories(name)")
      .in("id", unitIds)
    if (unitErr) return { error: unitErr.message }
    const unitById = new Map((unitRows ?? []).map((u) => [u.id, u]))
    const groups = new Map<string, { categoryId: string; start: string; end: string; qty: number; name: string }>()
    for (const eq of equipment) {
      const row = unitById.get(eq.unit_id)
      if (!row) {
        return { error: "One of your selected equipment items is no longer available — please go back and review your extras." }
      }
      const key = `${row.category_id}|${eq.start_date}|${eq.end_date}`
      const group = groups.get(key)
      if (group) group.qty++
      else groups.set(key, { categoryId: row.category_id, start: eq.start_date, end: eq.end_date, qty: 1, name: row.equipment_categories?.name ?? "item" })
    }
    for (const group of groups.values()) {
      const { data: availableUnits, error: availErr } = await supabase.rpc("get_available_equipment_units", {
        p_category_id: group.categoryId,
        p_start_date: group.start,
        p_end_date: group.end,
      })
      if (availErr) return { error: availErr.message }
      const count = availableUnits?.length ?? 0
      if (count < group.qty) {
        return { error: `Only ${count} of ${group.qty} ${group.name} is available for the selected dates — please reduce the quantity.` }
      }
    }
  }

  const { data: guest, error: guestErr } = await supabase
    .from("guests")
    .insert({
      full_name: data.guest.full_name,
      email: data.guest.email,
      phone: data.guest.phone,
      nationality: data.guest.nationality,
      nic_or_passport: data.guest.nic_or_passport,
    })
    .select()
    .single()
  if (guestErr) return { error: guestErr.message }

  const groupBookingId = crypto.randomUUID()
  const bookingIds: string[] = []
  let bookingNights = 1

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
        num_guests: sel.num_guests ?? partyFallback,
        room_total_usd: roomTotal,
        board_plan: boardPlan,
        board_total_usd: boardPricePerNight * nights,
        group_booking_id: groupBookingId,
      })
      .select()
      .single()

    if (bookingErr) {
      if (bookingErr.code === "23P01") {
        return { error: "Room was just booked by someone else. Please go back and choose a different room or dates." }
      }
      await supabase.from("guests").delete().eq("id", guest.id)
      return { error: bookingErr.message }
    }
    bookingIds.push(booking.id)
    bookingNights = nights
  }

  for (const eq of data.equipment || []) {
    await supabase.from("equipment_bookings").insert({
      unit_id: eq.unit_id,
      guest_id: guest.id,
      booking_id: bookingIds[0],
      start_date: eq.start_date,
      end_date: eq.end_date,
      price_usd: await equipmentItemPrice(eq.unit_id, eq.start_date, eq.end_date, bookingNights),
      status: "pending",
    })
  }

  if (data.transfer && transferDatetime) {
    await supabase.from("airport_transfers").insert({
      route_id: data.transfer.route_id,
      booking_id: bookingIds[0],
      guest_id: guest.id,
      direction: data.transfer.direction,
      flight_number: data.transfer.flight_number,
      transfer_datetime: transferDatetime,
      price_usd: await transferPrice(data.transfer.route_id),
      status: "scheduled",
    })
  }

  const totalResult = await computeBookingTotal(groupBookingId)
  if ("error" in totalResult) {
    await supabase.from("guests").delete().eq("id", guest.id)
    return { error: totalResult.error }
  }

  revalidatePath("/dashboard/calendar")
  return {
    data: {
      bookingIds,
      groupBookingId,
      orderId: `BOOK-${groupBookingId}`,
      grandTotal: totalResult.total,
    },
  }
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

export async function checkOut(bookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings").select("room_id").eq("id", bookingId).single()
  if (!booking) return { error: "Booking not found" }

  // ds09: check-out is the one place an invoice must exist — generate it if the
  // stay never got one (generateInvoice just re-issues when one already exists).
  const { data: existingInvoice } = await supabase
    .from("invoices").select("id").eq("booking_id", bookingId).maybeSingle()
  if (!existingInvoice) {
    const invoiceResult = await generateInvoice(bookingId)
    if ("error" in invoiceResult) return { error: invoiceResult.error }
  }

  const { error } = await supabase.from("bookings").update({ status: "checked_out" }).eq("id", bookingId)
  if (error) return { error: error.message }

  // The room just changed hands — flag it for housekeeping.
  if (booking.room_id) {
    const { error: roomErr } = await supabase
      .from("rooms").update({ housekeeping_status: "dirty" }).eq("id", booking.room_id)
    if (roomErr) return { error: roomErr.message }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`)
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

  // N3: release the holds this booking owns so inventory isn't stuck on a
  // cancelled booking. Equipment only holds stock while `pending`,
  // transfers while `scheduled` — never touch active/completed rows.
  const { error: eqErr } = await supabase
    .from("equipment_bookings").update({ status: "cancelled" }).eq("booking_id", id).eq("status", "pending")
  if (eqErr) return { error: eqErr.message }
  const { error: trErr } = await supabase
    .from("airport_transfers").update({ status: "cancelled" }).eq("booking_id", id).eq("status", "scheduled")
  if (trErr) return { error: trErr.message }

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
  const supabase = createAdminClient()
  const refUpper = refCode.toUpperCase().trim()

  const { data, error } = await supabase
    .rpc("lookup_booking_by_ref", { p_ref: refUpper, p_email: email.toLowerCase() })

  if (error) return { error: error.message }

  if (!data || data.length === 0) {
    return { error: "Booking not found or email does not match. Please check your details." }
  }

  return { data: data as BookingLookupResult[] }
}

export async function recordDeposit(bookingId: string, amount: number, method: "cash" | "bank_transfer" | "card_payhere" = "cash") {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  if (amount <= 0) return { error: "Amount must be positive" }

  const supabase = await createServerClient()
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount_usd: amount,
    method,
    status: "completed",
    paid_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}

export async function lookupBookingByGroupId(groupBookingId: string, email: string) {
  const supabase = createAdminClient()

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

export async function refundBookingPayment(paymentId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }

  const supabase = await createServerClient()

  // py01: refund the specific payment row the staff member clicked — a booking
  // can hold several card payments, so look the payment up by its own id.
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, booking_id, method, status, payhere_payment_id")
    .eq("id", paymentId)
    .single()

  if (payErr || !payment) return { error: "Payment not found" }
  if (payment.method !== "card_payhere" || payment.status !== "completed") {
    return { error: "Only completed PayHere card payments can be refunded" }
  }
  if (!payment.payhere_payment_id) return { error: "This payment has no gateway reference — refund it directly in the PayHere dashboard." }

  const result = await refundPayherePayment(payment.payhere_payment_id, "Booking cancelled")
  if (!result.success) return { error: `PayHere refund failed: ${result.error}` }

  const { error: updateErr } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id)
  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/dashboard/bookings/${payment.booking_id}`)
  return { data: null }
}
