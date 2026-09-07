import { createAdminClient } from "@/lib/supabase/admin"
import { surfboardTotalForDays, type TieredPricing } from "@/lib/constants"
import { rentalDays } from "@/lib/utils"

// Server-side equipment rental price, computed from DB price rules
// (tiered pricing for surfboard, per-day otherwise). Client-supplied
// prices are never trusted.
export async function equipmentItemPrice(unitId: string, startDate: string, endDate: string, fallbackNights: number): Promise<number> {
  const supabase = createAdminClient()
  const { data: unit } = await supabase
    .from("equipment_units")
    .select("category_id")
    .eq("id", unitId)
    .single()
  if (!unit) return 0
  const { data: category } = await supabase
    .from("equipment_categories")
    .select("price_per_day_usd, tiered_pricing")
    .eq("id", unit.category_id)
    .single()
  if (!category) return 0
  const days = rentalDays(startDate, endDate, fallbackNights)
  return surfboardTotalForDays(days, Number(category.price_per_day_usd), category.tiered_pricing as TieredPricing | null)
}

// Server-side transfer price, from airport_transfer_routes.fixed_price_usd.
export async function transferPrice(routeId: string): Promise<number> {
  const supabase = createAdminClient()
  const { data: route } = await supabase
    .from("airport_transfer_routes")
    .select("fixed_price_usd")
    .eq("id", routeId)
    .single()
  return route ? Number(route.fixed_price_usd) : 0
}

// Expected payable total for a booking group, recomputed from DB rows:
// room total + board + equipment + transfers, then the settings surcharge.
// Matches how the client displays the PayHere amount.
export async function computeBookingTotal(groupBookingId: string): Promise<{ total: number } | { error: string }> {
  const supabase = createAdminClient()
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, room_total_usd, board_total_usd")
    .eq("group_booking_id", groupBookingId)
  if (error) return { error: error.message }
  if (!bookings || bookings.length === 0) return { error: "Booking not found" }

  const bookingIds = bookings.map((b) => b.id)
  const roomAndBoard = bookings.reduce((s, b) => s + Number(b.room_total_usd ?? 0) + Number(b.board_total_usd ?? 0), 0)

  const [equipRes, transferRes, settingsRes] = await Promise.all([
    supabase.from("equipment_bookings").select("price_usd").in("booking_id", bookingIds),
    supabase.from("airport_transfers").select("price_usd").in("booking_id", bookingIds),
    supabase.from("settings").select("surcharge_pct").eq("id", true).maybeSingle(),
  ])

  const equipment = (equipRes.data ?? []).reduce((s, r) => s + Number(r.price_usd ?? 0), 0)
  const transfers = (transferRes.data ?? []).reduce((s, r) => s + Number(r.price_usd ?? 0), 0)
  const surchargePct = Number(settingsRes.data?.surcharge_pct ?? 0)

  const subtotal = roomAndBoard + equipment + transfers
  const total = subtotal * (1 + surchargePct / 100)
  return { total: Number(total.toFixed(2)) }
}