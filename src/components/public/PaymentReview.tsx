"use client"

import { useState } from "react"
import { formatCurrency, rentalDays } from "@/lib/utils"
import { createPayHereBooking } from "@/lib/actions/bookings"
import { getAvailableRooms } from "@/lib/actions/rooms"
import { getAvailableUnits } from "@/lib/actions/equipment"
import { EQUIPMENT_SURFBOARD, ROUTE_CMB, surfboardTotalForDays, SURFBOARD_TIERS, BOARD_LABEL, BOARD_PRICE_PER_NIGHT } from "@/lib/constants"
import type { BoardPlan } from "@/lib/constants"
import type { RoomSelection } from "./DateStep"

type VehicleCategory = { id: string; name: string; pricePerDay: number; subtitle?: string }

type PaymentReviewProps = {
  roomSelections: RoomSelection[]
  checkIn: string
  checkOut: string
  boardPlan: BoardPlan
  roomTotal: number
  boardTotal: number
  equipmentTotal: number
  vehiclesTotal: number
  transferTotal: number
  surchargePct: number
  grandTotal: number
  guest: { fullName: string; email: string; phone: string; nationality: string; nic_passport: string; numGuests: number }
  extras: {
    surfboardQty: number
    surfboardStart: string; surfboardEnd: string
    items: Array<{ categoryId: string; qty: number; start: string; end: string }>
    transferNeeded: boolean; transferDirection: string
    flightNumber: string; transferTime: string
  }
  pricing: {
    surfboardPricePerDay: number
    transferPrice: number
    motorbikes: VehicleCategory[]
    cars: VehicleCategory[]
  }
  totalRooms: number
  nights: number
  onBack: () => void
  onSuccess?: () => void
}

export function PaymentReview({
  roomSelections, checkIn, checkOut, boardPlan,
  roomTotal, boardTotal, equipmentTotal, vehiclesTotal, transferTotal, surchargePct, grandTotal,
  guest, extras, pricing, totalRooms, nights, onBack, onSuccess,
}: PaymentReviewProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "booking" | "error">("idle")
  const [error, setError] = useState("")
  // The server recomputes the payable total; when it differs from the displayed
  // one we show the server's figure so what's on screen equals what PayHere charges.
  const [serverGrandTotal, setServerGrandTotal] = useState<number | null>(null)

  async function checkAndBuildData() {
    const allRooms: Array<{ room_id: string; check_in: string; check_out: string; maxOccupancy: number; num_guests: number }> = []
    for (const sel of roomSelections) {
      const avail = await getAvailableRooms(sel.categoryId, checkIn, checkOut)
      if (avail.error || !avail.data?.length) {
        throw new Error(avail.error || `No rooms available for ${sel.categoryName}`)
      }
      for (let i = 0; i < sel.quantity; i++) {
        allRooms.push({
          room_id: avail.data[i % avail.data.length].id,
          check_in: checkIn,
          check_out: checkOut,
          maxOccupancy: sel.maxOccupancy,
          num_guests: 0,
        })
      }
    }

    // bk01: split the party across the booked rooms (even split, capped by each
    // room's maxOccupancy, leftovers to rooms with spare capacity).
    const totalGuests = Math.max(1, Math.round(Number(guest.numGuests) || 1))
    const per = Math.floor(totalGuests / allRooms.length)
    const extra = totalGuests - per * allRooms.length
    let remaining = totalGuests
    for (let i = 0; i < allRooms.length; i++) {
      allRooms[i].num_guests = Math.min(allRooms[i].maxOccupancy, per + (i < extra ? 1 : 0))
      remaining -= allRooms[i].num_guests
    }
    for (let i = 0; i < allRooms.length && remaining > 0; i++) {
      const spare = allRooms[i].maxOccupancy - allRooms[i].num_guests
      const add = Math.min(spare, remaining)
      allRooms[i].num_guests += add
      remaining -= add
    }

    const equipment: Array<{ unit_id: string; start_date: string; end_date: string }> = []
    if (extras.surfboardQty > 0) {
      const surfStart = extras.surfboardStart || checkIn
      const surfEnd = extras.surfboardEnd || checkOut
      const units = await getAvailableUnits(EQUIPMENT_SURFBOARD, surfStart, surfEnd)
      if (units.error) throw new Error(units.error)
      // bk03/N4: block instead of silently shrinking the order
      if (!units.data || units.data.length < extras.surfboardQty) {
        throw new Error(`Only ${units.data?.length ?? 0} of ${extras.surfboardQty} surfboards is available for these dates — please reduce the quantity.`)
      }
      for (let i = 0; i < extras.surfboardQty; i++) {
        equipment.push({ unit_id: units.data[i].id, start_date: surfStart, end_date: surfEnd })
      }
    }

    const lookup = new Map<string, VehicleCategory>()
    for (const m of pricing.motorbikes) lookup.set(m.id, m)
    for (const c of pricing.cars) lookup.set(c.id, c)
    for (const it of extras.items) {
      const cat = lookup.get(it.categoryId)
      if (!cat) continue
      const start = it.start || checkIn
      const end = it.end || checkOut
      const units = await getAvailableUnits(it.categoryId, start, end)
      if (units.error) throw new Error(units.error)
      // bk03/N4: block instead of silently shrinking the order
      if (!units.data || units.data.length < it.qty) {
        throw new Error(`Only ${units.data?.length ?? 0} of ${it.qty} ${cat.name} vehicles are available for these dates — please reduce the quantity.`)
      }
      for (let i = 0; i < it.qty; i++) {
        equipment.push({ unit_id: units.data[i].id, start_date: start, end_date: end })
      }
    }

    // bk02/N5: the server computes transfer_datetime from the raw HH:mm time and
    // direction against the correct stay date — don't build it client-side.
    const transfer = extras.transferNeeded
      ? { route_id: ROUTE_CMB, direction: extras.transferDirection as "arrival" | "departure", flight_number: extras.flightNumber || undefined, transferTime: extras.transferTime }
      : undefined

    return {
      allRooms: allRooms.map((room) => ({
        room_id: room.room_id,
        check_in: room.check_in,
        check_out: room.check_out,
        num_guests: room.num_guests,
      })),
      equipment,
      transfer,
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
        board_plan: boardPlan,
        equipment: equipment.length > 0 ? equipment : undefined,
        transfer,
      })
      if (result.error) { setError(result.error); setStatus("idle"); return }
      const { bookingIds, groupBookingId, orderId, grandTotal: serverTotal } = result.data!
      if (Math.abs(serverTotal - grandTotal) > 0.01) setServerGrandTotal(serverTotal)
      const currency = "USD"

      const hashRes = await fetch("/api/payhere/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, currency }),
      })
      if (!hashRes.ok) { setError("Failed to initialize payment"); setStatus("idle"); return }
      const { hash, merchant_id } = await hashRes.json()

      onSuccess?.()

      const form = document.createElement("form")
      form.method = "POST"
      form.action =
        process.env.NEXT_PUBLIC_PAYHERE_MODE === "live"
          ? "https://www.payhere.lk/pay/checkout"
          : "https://sandbox.payhere.lk/pay/checkout"
      form.style.display = "none"

      const fields: Record<string, string> = {
        merchant_id,
        return_url: `${window.location.origin}/api/payhere/return?booking_id=${bookingIds[0]}`,
        cancel_url: `${window.location.origin}/api/payhere/cancel?group=${groupBookingId}`,
        notify_url: `${window.location.origin}/api/payhere/notify`,
        order_id: orderId,
        items: "Le Palme Ahangama — Room Booking",
        currency,
        amount: serverTotal.toFixed(2),
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
    } catch (e) {
      // bk03/N4: surface the explicit availability message instead of a generic error
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.")
      setStatus("idle")
    }
  }

  const vehicleLookup = new Map<string, VehicleCategory>()
  for (const m of pricing.motorbikes) vehicleLookup.set(m.id, m)
  for (const c of pricing.cars) vehicleLookup.set(c.id, c)

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
              <span className="text-stone-900 dark:text-stone-100">{formatCurrency(Number(sel.basePrice) * nights * sel.quantity)}</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {sel.quantity} room{sel.quantity > 1 ? "s" : ""} &times; {nights} nights &middot; Up to {sel.maxOccupancy} guests each
            </p>
          </div>
        ))}

        {extras.surfboardQty > 0 && (() => {
          const days = rentalDays(extras.surfboardStart || checkIn, extras.surfboardEnd || checkOut, nights)
          const total = surfboardTotalForDays(days, pricing.surfboardPricePerDay, SURFBOARD_TIERS)
          return (
            <div className="border border-stone-200 dark:border-stone-800 p-3 text-sm font-sans">
              <div className="flex justify-between">
                <span className="font-medium text-stone-900 dark:text-stone-100">Surfboard &times; {extras.surfboardQty}</span>
                <span className="text-stone-900 dark:text-stone-100">{formatCurrency(total * extras.surfboardQty)}</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{extras.surfboardStart || checkIn} &rarr; {extras.surfboardEnd || checkOut} &middot; {days} day{days > 1 ? "s" : ""} (tiered)</p>
            </div>
          )
        })()}
        {extras.items.map((it, idx) => {
          const cat = vehicleLookup.get(it.categoryId)
          if (!cat) return null
          const days = rentalDays(it.start || checkIn, it.end || checkOut, nights)
          return (
            <div key={`${it.categoryId}-${idx}`} className="border border-stone-200 dark:border-stone-800 p-3 text-sm font-sans">
              <div className="flex justify-between">
                <span className="font-medium text-stone-900 dark:text-stone-100">{cat.name} &times; {it.qty}</span>
                <span className="text-stone-900 dark:text-stone-100">{formatCurrency(it.qty * cat.pricePerDay * days)}</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{it.start || checkIn} &rarr; {it.end || checkOut} &middot; {days} day{days > 1 ? "s" : ""} &middot; ${cat.pricePerDay}/day</p>
            </div>
          )
        })}
        {extras.transferNeeded && (
          <div className="border border-stone-200 dark:border-stone-800 p-3 text-sm font-sans">
            <div className="flex justify-between">
              <span className="font-medium text-stone-900 dark:text-stone-100">Airport Transfer ({extras.transferDirection})</span>
              <span className="text-stone-900 dark:text-stone-100">{formatCurrency(transferTotal)}</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">CMB &rarr; Ahangama{extras.flightNumber ? ` &middot; Flight ${extras.flightNumber}` : ""}{extras.transferTime ? ` &middot; ${extras.transferTime}` : ""}</p>
          </div>
        )}
      </div>

      <table className="w-full text-sm font-sans">
        <tbody>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Room total</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(roomTotal)}</td>
          </tr>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">{BOARD_LABEL(boardPlan)}</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{BOARD_PRICE_PER_NIGHT(boardPlan) > 0 ? `+${formatCurrency(boardTotal)}` : "—"}</td>
          </tr>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Equipment total</td>
            <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(equipmentTotal)}</td>
          </tr>
          {vehiclesTotal > 0 && (
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <td className="py-2 font-medium text-stone-900 dark:text-stone-100">Vehicles total</td>
              <td className="py-2 text-right text-stone-900 dark:text-stone-100">{formatCurrency(vehiclesTotal)}</td>
            </tr>
          )}
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
            <td className="py-3 text-right font-bold text-base text-stone-900 dark:text-stone-100">{formatCurrency(serverGrandTotal ?? grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-3">
        <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Payment</p>

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

          {error && <p className="text-sm text-red-500 font-sans mt-3">{error}</p>}

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
