import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookingDetail } from "@/components/dashboard/BookingDetail"

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const [rowRes, settingsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, guests(*), rooms!inner(*, room_categories!inner(*)), booking_charges(*), invoices(*), payments(*)")
      .eq("id", id)
      .single(),
    supabase.from("settings").select("min_deposit_pct").eq("id", true).single(),
  ])

  const { data: row } = rowRes
  if (!row) notFound()

  const toArray = <T,>(v: T[] | T | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])

  const booking = {
    ...row,
    invoices: toArray(row.invoices),
    payments: toArray(row.payments),
  }

  const { data: settings } = settingsRes

  return <BookingDetail booking={booking} minDepositPct={Number(settings?.min_deposit_pct ?? 50)} />
}
