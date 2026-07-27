"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { settingsSchema } from "@/lib/validations"
import { requireAdmin } from "@/lib/auth"

export async function getSettings() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).single()
  return error ? { error: error.message } : { data }
}

export async function updateSettings(data: {
  check_in_time?: string; check_out_time?: string
  surcharge_pct?: number; min_deposit_pct?: number
}) {
  const auth = await requireAdmin()
  if ("error" in auth) return { error: auth.error }
  const result = settingsSchema.safeParse({
    checkInTime: data.check_in_time, checkOutTime: data.check_out_time,
    surchargePct: data.surcharge_pct, minDepositPct: data.min_deposit_pct,
  })
  if (!result.success) return { error: result.error.issues[0].message }
  const supabase = await createServerClient()
  const { error } = await supabase.from("settings").update(data).eq("id", true)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/admin")
  return { data: null }
}
