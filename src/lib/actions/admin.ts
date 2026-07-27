"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { pricingUpdateSchema } from "@/lib/validations"
import { requireStaff, requireAdmin } from "@/lib/auth"

export async function getStaffList() {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, active")
  return error ? { error: error.message } : { data }
}

export async function deactivateStaff(id: string) {
  const auth = await requireAdmin()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("profiles").update({ active: false }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/admin")
  return { data: null }
}

export async function updatePricing(categoryId: string, basePriceUsd: number) {
  const auth = await requireAdmin()
  if ("error" in auth) return { error: auth.error }
  const result = pricingUpdateSchema.safeParse({ basePriceUsd })
  if (!result.success) return { error: result.error.issues[0].message }
  const supabase = await createServerClient()
  const { error } = await supabase
    .from("room_categories").update({ base_price_usd: basePriceUsd }).eq("id", categoryId)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/admin")
  return { data: null }
}

export async function toggleRoomMaintenance(roomId: string, currentStatus: Database["public"]["Enums"]["room_operational_status"]) {
  const auth = await requireAdmin()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const newStatus: Database["public"]["Enums"]["room_operational_status"] = currentStatus === "active" ? "retired" : "active"
  const { error } = await supabase
    .from("rooms").update({ operational_status: newStatus }).eq("id", roomId)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/admin")
  return { data: null }
}
