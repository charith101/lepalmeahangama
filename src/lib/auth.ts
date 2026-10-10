import { createClient } from "@/lib/supabase/server"

type AuthOK = { user: { id: string; role: string } }
type AuthErr = { error: string }
export type AuthResult = AuthOK | AuthErr

export async function requireStaff(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single()
  if (!profile) return { error: "Staff profile not found" }
  if (profile.active === false) return { error: "Account deactivated" }
  if (profile.role !== "admin" && profile.role !== "receptionist")
    return { error: "Insufficient permissions" }
  return { user: { id: user.id, role: profile.role } }
}

export async function requireAnyStaff(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single()
  if (!profile) return { error: "Staff profile not found" }
  if (profile.active === false) return { error: "Account deactivated" }
  return { user: { id: user.id, role: profile.role } }
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireStaff()
  if ("error" in result) return result
  if (result.user.role !== "admin") return { error: "Admin access required" }
  return result
}
