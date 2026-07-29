"use client"

import { useState } from "react"
import { CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { createMultiRoomBooking, createPayHereBooking } from "@/lib/actions/bookings"
import { getAvailableRooms } from "@/lib/actions/rooms"
import { getAvailableUnits } from "@/lib/actions/equipment"
import { EQUIPMENT_SURFBOARD, EQUIPMENT_BICYCLE, ROUTE_CMB } from "@/lib/constants"
import type { RoomSelection } from "./DateStep"

type PaymentReviewProps = {
  roomSelections: RoomSelection[]
  checkIn: string
  checkOut: string
  roomTotal: number
  equipmentTotal: number
  transferTotal: number
  surchargePct: number
  grandTotal: number
  guest: { fullName: string; email: string; phone: string; nationality: string; nic_passport: string }
  extras: {
    surfboardQty: number; bicycleQty: number
    equipmentStart: string; equipmentEnd: string
    transferNeeded: boolean; transferDirection: string
    flightNumber: string; transferTime: string
  }
  pricing: { surfboardPricePerDay: number; bicyclePricePerDay: number; transferPrice: number }
  totalRooms: number
  nights: number
  onBack: () => void
  onSuccess?: () => void
}

export function PaymentReview({
  roomSelections, checkIn, checkOut,
  roomTotal, equipmentTotal, transferTotal, surchargePct, grandTotal,
  guest, extras, pricing, totalRooms, nights, onBack, onSuccess,
}: PaymentReviewProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "booking" | "error">("idle")
  const [error, setError] = useState("")

  async function checkAndBuildData() {
    const allRooms: Array<{ room_id: string; check_in: string; check_out: string; room_total_usd: number }> = []
    for (const sel of roomSelections) {
      const avail = await getAvailableRooms(sel.categoryId, checkIn, checkOut)
      if (avail.error || !avail.data?.length) {
        throw new Error(avail.error || `No rooms available for ${sel.categoryName}`)
      }
      const roomPricePerNight = Number(sel.basePrice)
      for (let i = 0; i < sel.quantity; i++) {
        allRooms.push({
          room_id: avail.data[i % avail.data.length].id,
          check_in: checkIn,
          check_out: checkOut,
          room_total_usd: roomPricePerNight * nights,
        })
      }
    }

    const equipment: Array<{ unit_id: string; start_date: string; end_date: string; price_usd: number }> = []
    if (extras.surfboardQty > 0) {
      const units = await getAvailableUnits(EQUIPMENT_SURFBOARD, extras.equipmentStart || checkIn, extras.equipmentEnd || checkOut)
      if (units.data) {
        for (let i = 0; i < Math.min(extras.surfboardQty, units.data.length); i++) {
          equipment.push({ unit_id: units.data[i].id, start_date: extras.equipmentStart || checkIn, end_date: extras.equipmentEnd || checkOut, price_usd: pricing.surfboardPricePerDay * nights })
        }
      }
    }
    if (extras.bicycleQty > 0) {
      const units = await getAvailableUnits(EQUIPMENT_BICYCLE, extras.equipmentStart || checkIn, extras.equipmentEnd || checkOut)
      if (units.data) {
        for (let i = 0; i < Math.min(extras.bicycleQty, units.data.length); i++) {
          equipment.push({ unit_id: units.data[i].id, start_date: extras.equipmentStart || checkIn, end_date: extras.equipmentEnd || checkOut, price_usd: pricing.bicyclePricePerDay * nights })
        }
      }
    }

    const transfer = extras.transferNeeded
      ? { route_id: ROUTE_CMB, direction: extras.transferDirection as "arrival" | "departure", flight_number: extras.flightNumber || undefined, transfer_datetime: `${checkIn}T${extras.transferTime || "12:00"}:00Z`, price_usd: pricing.transferPrice }
      : undefined

    return { allRooms, equipment, transfer }
  }

  async function handlePay() {
    setStatus("loading")
    setError("")
    try {
      const { allRooms, equipment, transfer } = await checkAndBuildData()
      setStatus("booking")
      const result = await createMultiRoomBooking({
        guest: { full_name: guest.fullName, email: guest.email || undefined, phone: guest.phone || undefined, nationality: guest.nationality || undefined, nic_or_passport: guest.nic_passport || undefined },
        roomSelections: allRooms,
        grand_total_usd: grandTotal,
        equipment: equipment.length > 0 ? equipment : undefined,
        transfer,
      })
      if (result.error) { setError(result.error); setStatus("idle"); return }
      if (!result.data?.polarCheckoutUrl) { setError("Failed to initialize payment"); setStatus("idle"); return }
      onSuccess?.()
      window.location.href = result.data.polarCheckoutUrl
    } catch {
      setError("Something went wrong. Please try again.")
      setStatus("idle")
    }
  }

  async function handlePayhere() {
    setStatus("loading")
    setError("")
    try {
      const { allRooms, equipment, transfer } = await checkAndBuildData()
      setStatus("booking")
      const result = await createPayHereBooking({
        guest: { full_name: guest.fullName, email: guest.email || undefined, phone: guest.phone || undefined, nationality: guest.nationality || undefined, nic_or_passport: guest.nic_passport || undefined },
        roomSelections: allRooms,
        grand_total_usd: grandTotal,
        equipment: equipment.length > 0 ? equipment : undefined,
        transfer,
      })
      if (result.error) { setError(result.error); setStatus("idle"); return }
      const { bookingIds, groupBookingId, grandTotal: total } = result.data!
      const orderId = `BOOK-${groupBookingId.slice(0, 8).toUpperCase()}`
      const currency = "USD"
      const amount = total.toFixed(2)

      const hashRes = await fetch("/api/payhere/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, amount, currency }),
      })
      if (!hashRes.ok) { setError("Failed to initialize payment"); setStatus("idle"); return }
      const { hash, merchant_id } = await hashRes.json()

      onSuccess?.()

      const form = document.createElement("form")
      form.method = "POST"
      form.action = "https://sandbox.payhere.lk/pay/checkout"
      form.style.display = "none"

      const fields: Record<string, string> = {
        merchant_id,
        return_url: `${window.location.origin}/api/payhere/return?booking_id=${bookingIds[0]}`,
        cancel_url: `${window.location.origin}/api/payhere/cancel`,
        notify_url: `${window.location.origin}/api/payhere/notify`,
        order_id: orderId,
        items: "Le Palme Ahangama — Room Booking",
        currency,
        amount,
        hash,
        first_name: guest.fullName.split(" ")[0] || guest.fullName,
        last_name: guest.fullName.split(" ").slice(1).join(" ") || "Guest",
        email: guest.email,
        phone: guest.phone,
        address: "Le Palme Ahangama",
        city: "Ahangama",
        country: "Sri Lanka",
        custom_1: groupBookingId,
        custom_2: bookingIds[0],
      }

      for (const [k, v] of Object.entries(fields)) {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = k
        input.value = v
        form.appendChild(input)
      }

      document.body.appendChild(form)
      form.submit()
    } catch {
      setError("Something went wrong. Please try again.")
      setStatus("idle")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Review &amp; Pay</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">
          {totalRooms} room{totalRooms > 1 ? "s" : ""} &middot; {nights} night{nights > 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-3">
        {roomSelections.map((sel) => (
          <div key={sel.categoryId} className="border border-stone-200 dark:border-stone-800 p-3 text-sm font-sans">
            <div className="flex justify-between">
              <span className="font-medium text-stone-900 dark:text-stone-100">{sel.categoryName}</span>
              <span className="text-stone-900 dark:text-stone-100">{formatCurrency(Number(sel.basePrice) * nights)}</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {sel.quantity} room{sel.quantity > 1 ? "s" : ""} &times; {nights} nights &middot; Up to {sel.maxOccupancy} guests each
            </p>
          </div>
        ))}
      </div>

      <table className="w-full text-sm font-sans">
        <tbody>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Room total</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(roomTotal)}</td>
          </tr>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Equipment total</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(equipmentTotal)}</td>
          </tr>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Transfer total</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(transferTotal)}</td>
          </tr>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Surcharge ({surchargePct}%)</td>
            <td className="py-2 text-right text-stone-500 dark:text-stone-400">{surchargePct}%</td>
          </tr>
          <tr>
            <td className="py-3 font-bold text-base text-stone-900 dark:text-stone-100">Grand total</td>
            <td className="py-3 text-right font-bold text-base text-stone-900 dark:text-stone-100">{formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-3">
        <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Payment</p>

        <div className="border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="size-5 shrink-0 mt-0.5 text-stone-500 dark:text-stone-400" />
            <div className="flex-1">
              <span className="font-medium text-sm font-sans text-stone-900 dark:text-stone-100">Pay with Polar</span>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400 mt-0.5">
                Pay instantly online via Polar. International processing fees may apply.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-sans mt-3">{error}</p>}

          <button
            onClick={handlePay}
            disabled={status !== "idle"}
            className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 mt-3"
          >
            {status === "loading" ? "Checking availability..." : status === "booking" ? "Creating booking..." : "Pay with Polar"}
          </button>
        </div>

        <div className="border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-start gap-3">
            <svg className="size-5 shrink-0 mt-0.5 text-stone-500 dark:text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 9v6" />
              <path d="M9 12h6" />
            </svg>
            <div className="flex-1">
              <span className="font-medium text-sm font-sans text-stone-900 dark:text-stone-100">Pay with PayHere</span>
              <p className="text-xs font-sans text-stone-500 dark:text-stone-400 mt-0.5">
                Secure local payment via PayHere. Visa, Mastercard, and Sri Lankan banking.
              </p>
            </div>
          </div>

          <button
            onClick={handlePayhere}
            disabled={status !== "idle"}
            className="w-full py-2.5 bg-emerald-700 text-white text-sm font-sans font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 mt-3"
          >
            {status === "loading" ? "Checking availability..." : status === "booking" ? "Creating booking..." : "Pay with PayHere"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50" disabled={status !== "idle"}>Back</button>
      </div>
    </div>
  )
}
