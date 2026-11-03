"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAnyStaff, requireStaff } from "@/lib/auth"

export async function reportMaintenanceIssue(data: {
  roomId: string
  description: string
  priority?: "low" | "normal" | "high" | "urgent"
}) {
  if (!data.description?.trim()) return { error: "Description is required" }

  const auth = await requireAnyStaff()
  if ("error" in auth) return { error: auth.error }

  const supabase = await createServerClient()
  const { error } = await supabase.from("maintenance_requests").insert({
    room_id: data.roomId,
    reported_by_staff_id: auth.user.id,
    description: data.description.trim(),
    priority: data.priority ?? "normal",
    status: "open",
  })
  if (error) return { error: error.message }

  revalidatePath("/dashboard/housekeeping")
  revalidatePath("/dashboard/admin")
  return { data: null }
}

export async function getMaintenanceRequests(status?: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  let query = supabase
    .from("maintenance_requests")
    .select("*, rooms(room_number, room_categories(name)), profiles!reported_by_staff_id(full_name)")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}

export async function updateMaintenanceStatus(id: string, status: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      status,
      // Terminal states stamp the resolver; reopening clears the resolution.
      ...(status === "resolved" || status === "closed"
        ? { resolved_at: new Date().toISOString(), resolved_by_staff_id: auth.user.id }
        : {}),
      ...(status === "open" ? { resolved_at: null, resolved_by_staff_id: null } : {}),
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/admin")
  return { data: null }
}
