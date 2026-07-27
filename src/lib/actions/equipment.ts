"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { equipmentRentalSchema } from "@/lib/validations"
import { requireStaff } from "@/lib/auth"

export async function getEquipmentCategories() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("equipment_categories").select("*")
  return error ? { error: error.message } : { data }
}

export async function getAvailableUnits(categoryId: string, startDate: string, endDate: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc("get_available_equipment_units", {
    p_category_id: categoryId,
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) return { error: error.message }
  return { data }
}

export async function createRental(data: {
  unit_id: string; guest_id: string; booking_id?: string
  start_date: string; end_date: string; price_usd: number
}) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const result = equipmentRentalSchema.safeParse({
    categoryId: "placeholder", unitId: data.unit_id, guestId: data.guest_id,
    startDate: data.start_date, endDate: data.end_date,
  })
  if (!result.success) return { error: result.error.issues.map((i) => i.message).join("; ") }
  const supabase = createAdminClient()
  const { error } = await supabase.from("equipment_bookings").insert({ ...data, status: "active" })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/equipment")
  return { data: null }
}

export async function returnUnit(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("equipment_bookings").update({ status: "returned" }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/equipment")
  return { data: null }
}

export async function getActiveRentals() {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("equipment_bookings")
    .select("*, equipment_units(unit_label, equipment_categories(name)), guests(full_name)")
    .eq("status", "active")
  return error ? { error: error.message } : { data }
}
