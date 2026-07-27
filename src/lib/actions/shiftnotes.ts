"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { requireStaff } from "@/lib/auth"

export async function addShiftNote(content: string) {
  if (!content?.trim() || content.length > 500)
    return { error: "Note must be 1-500 characters" }

  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }

  const supabase = await createServerClient()
  const { error } = await supabase.from("shift_notes").insert({
    content: content.trim(),
    created_by_staff_id: auth.user.id,
  })
  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  return { data: null }
}

export async function deleteShiftNote(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("shift_notes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return { data: null }
}

export async function getShiftNotes(limit = 10) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("shift_notes")
    .select("*, profiles!created_by_staff_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return { error: error.message }
  return { data }
}
