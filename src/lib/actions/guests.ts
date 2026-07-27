"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"

export async function createGuest(data: {
  full_name: string
  email?: string
  phone?: string
  nationality?: string
  nic_or_passport?: string
}) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = createAdminClient()
  const { data: guest, error } = await supabase
    .from("guests")
    .insert(data)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: guest }
}

export async function searchGuests(query: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const sanitized = query.replace(/[%_]/g, "")
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
    .limit(20)
  if (error) return { error: error.message }
  return { data }
}

export async function getGuestRegister(options?: { limit?: number; offset?: number }) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return { error: error.message }
  return { data }
}

export async function getGuest(id: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("guests").select("*").eq("id", id).single()
  if (error) return { error: error.message }
  return { data }
}

export async function updateGuest(id: string, data: Partial<{
  full_name: string
  email: string
  phone: string
  nationality: string
  nic_or_passport: string
}>) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("guests").update(data).eq("id", id)
  if (error) return { error: error.message }
  return { data: null }
}

export async function getGuestWithBookings(guestId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", guestId)
    .single()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, rooms(room_number, room_categories(name))")
    .eq("guest_id", guestId)
    .order("check_in", { ascending: false })

  if (!guest) return { error: "Guest not found" }
  const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id)
  let paymentsData: Array<{ amount_usd: number; status: string }> = []
  if (bookingIds.length > 0) {
    const { data: pd } = await supabase
      .from("payments")
      .select("amount_usd, status")
      .in("booking_id", bookingIds)
    paymentsData = pd ?? []
  }

  const totalSpent = (bookings ?? []).reduce(
    (s, b: { room_total_usd: number | null }) => s + Number(b.room_total_usd || 0), 0
  )
  const totalPaid = paymentsData
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount_usd || 0), 0)

  return {
    data: { guest, bookings: bookings ?? [], totalSpent, totalPaid, outstanding: totalSpent - totalPaid },
  }
}
