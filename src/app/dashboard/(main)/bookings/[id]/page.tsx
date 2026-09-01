import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookingDetail } from "@/components/dashboard/BookingDetail"

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: row } = await supabase
    .from("bookings")
    .select("*, guests(*), rooms!inner(*, room_categories!inner(*)), booking_charges(*), invoices(*), payments(*)")
    .eq("id", id)
    .single()

  if (!row) notFound()

  const booking = {
    ...row,
    invoices: row.invoices ? [row.invoices] : [],
    payments: row.payments ? [row.payments] : [],
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("min_deposit_pct")
    .eq("id", true)
    .single()

  return <BookingDetail booking={booking} minDepositPct={Number(settings?.min_deposit_pct ?? 50)} />
}
