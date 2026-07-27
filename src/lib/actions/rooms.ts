"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { requireStaff } from "@/lib/auth"

export async function getRoomCategories() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("room_categories").select("*").order("base_price_usd")
  if (error) return { error: error.message }
  return { data }
}

export async function getAvailableRooms(categoryId: string, checkIn: string, checkOut: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc("get_available_rooms", {
    p_category_id: categoryId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  })
  if (error) return { error: error.message }
  return { data }
}

export async function getCalendarBookings(start: string, end: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc("get_calendar_bookings", {
    p_start: start,
    p_end: end,
  })
  if (error) return { error: error.message }
  return { data }
}

export async function getAllRooms() {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("rooms")
    .select("*, room_categories(name)")
    .order("room_number")
  if (error) return { error: error.message }
  return { data }
}

export async function getAllAvailableRooms(checkIn: string, checkOut: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data: bookedRoomIds } = await supabase
    .from("bookings")
    .select("room_id")
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)

  const booked = new Set((bookedRoomIds ?? []).map((b: any) => b.room_id))
  const { data, error } = await supabase
    .from("rooms")
    .select("*, room_categories(name)")
    .eq("operational_status", "active")
    .order("room_number")
  if (error) return { error: error.message }
  const available = data.filter((r) => !booked.has(r.id))
  return { data: available }
}

export async function moveGuestToRoom(bookingId: string, newRoomId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data: booking } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("id", bookingId)
    .single()
  if (!booking) return { error: "Booking not found" }

  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", newRoomId)
    .in("status", ["confirmed", "checked_in"])
    .lt("check_in", booking.check_out)
    .gt("check_out", booking.check_in)
    .neq("id", bookingId)

  if (conflicts && conflicts.length > 0) {
    return { error: "Selected room is occupied during those dates" }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ room_id: newRoomId })
    .eq("id", bookingId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}

export async function updateRoomHousekeepingStatus(roomId: string, status: Database["public"]["Enums"]["room_housekeeping_status"]) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase
    .from("rooms")
    .update({ housekeeping_status: status })
    .eq("id", roomId)
  if (error) return { error: error.message }
  return { data: null }
}
