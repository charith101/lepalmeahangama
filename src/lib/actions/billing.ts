"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { chargeSchema, recordPaymentSchema } from "@/lib/validations"
import { requireStaff } from "@/lib/auth"

export async function postCharge(bookingId: string, data: {
  description: string; category: Database["public"]["Enums"]["charge_category"]; quantity: number; unit_price_usd: number
}) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const result = chargeSchema.safeParse({
    description: data.description,
    category: data.category,
    quantity: data.quantity,
    unitPrice: data.unit_price_usd,
  })
  if (!result.success) return { error: result.error.issues.map((i) => i.message).join("; ") }

  const supabase = await createServerClient()
  const lineTotal = data.quantity * data.unit_price_usd
  const { error } = await supabase.from("booking_charges").insert({
    booking_id: bookingId,
    description: data.description,
    category: data.category,
    quantity: data.quantity,
    unit_price_usd: data.unit_price_usd,
    line_total_usd: lineTotal,
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}

export async function generateInvoice(bookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data: booking } = await supabase
    .from("bookings").select("room_total_usd, board_total_usd").eq("id", bookingId).single()

  const { data: eqData } = await supabase
    .from("equipment_bookings").select("price_usd").eq("booking_id", bookingId).eq("status", "active")
  const equipmentTotal = (eqData || []).reduce((s: number, r: { price_usd: number | null }) => s + Number(r.price_usd || 0), 0)

  const { data: transferData } = await supabase
    .from("airport_transfers").select("price_usd").eq("booking_id", bookingId)
  const transferTotal = (transferData || []).reduce((s, r) => s + Number(r.price_usd || 0), 0)

  const { data: chargeData } = await supabase
    .from("booking_charges").select("line_total_usd").eq("booking_id", bookingId)
  const chargeTotal = (chargeData || []).reduce((s, r) => s + Number(r.line_total_usd || 0), 0)

  const roomTotal = Number(booking?.room_total_usd || 0)
  const boardTotal = Number(booking?.board_total_usd || 0)
  const addonTotal = boardTotal + equipmentTotal + transferTotal + chargeTotal

  const { data: settings } = await supabase
    .from("settings").select("surcharge_pct").eq("id", true).single()
  const surchargePct = Number(settings?.surcharge_pct || 0)
  const grandTotal = (roomTotal + addonTotal) * (1 + surchargePct / 100)

  const { data: existing } = await supabase
    .from("invoices").select("id").eq("booking_id", bookingId).maybeSingle()

  if (existing) {
    const { error } = await supabase.from("invoices").update({
      room_charges_total_usd: roomTotal,
      addon_charges_total_usd: addonTotal,
      surcharge_pct_applied: surchargePct,
      grand_total_usd: grandTotal,
      status: "issued",
      issued_at: new Date().toISOString(),
    }).eq("id", existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("invoices").insert({
      booking_id: bookingId,
      room_charges_total_usd: roomTotal,
      addon_charges_total_usd: addonTotal,
      surcharge_pct_applied: surchargePct,
      grand_total_usd: grandTotal,
      status: "issued",
      issued_at: new Date().toISOString(),
    })
    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: { roomTotal, addonTotal, surchargePct, grandTotal } }
}

export async function getInvoice(bookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("invoices").select("*").eq("booking_id", bookingId).maybeSingle()
  return error ? { error: error.message } : { data }
}

export async function recordPayment(bookingId: string, data: {
  amount_usd: number; method: Database["public"]["Enums"]["payment_method"]; invoice_id?: string
}) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const result = recordPaymentSchema.safeParse({ amount: data.amount_usd, method: data.method })
  if (!result.success) return { error: result.error.issues.map((i) => i.message).join("; ") }

  const supabase = await createServerClient()
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    invoice_id: data.invoice_id,
    amount_usd: data.amount_usd,
    method: data.method,
    status: "completed",
    paid_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }

  if (data.invoice_id) {
    await supabase.from("invoices").update({ status: "paid" }).eq("id", data.invoice_id)
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}

export async function confirmBankTransfer(bookingId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()

  const { data: pending } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .eq("method", "bank_transfer")
    .maybeSingle()

  if (pending) {
    const { error: payErr } = await supabase
      .from("payments")
      .update({ status: "completed", paid_at: new Date().toISOString() })
      .eq("id", pending.id)
    if (payErr) return { error: payErr.message }
  }

  const { error: bookErr } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
  if (bookErr) return { error: bookErr.message }

  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { data: null }
}
