"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { guestSchema, type GuestData } from "@/lib/validations"

export type { GuestData }

type GuestDetailsStepProps = {
  onNext: (data: GuestData) => void
  onBack: () => void
  initialData?: Partial<GuestData>
  /** Summed maxOccupancy of the selected rooms — party size is capped at this. */
  maxGuests?: number
}

export function GuestDetailsStep({ onNext, onBack, initialData, maxGuests }: GuestDetailsStepProps) {
  // z.coerce gives guestSchema a different input (numGuests: unknown) and output
  // (numGuests: number) type — RHF needs both generics declared (zod v4 pattern).
  const { register, handleSubmit, watch, formState: { errors } } = useForm<z.input<typeof guestSchema>, unknown, z.output<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullName: initialData?.fullName ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      nationality: initialData?.nationality ?? "",
      nic_passport: initialData?.nic_passport ?? "",
      numGuests: initialData?.numGuests ?? 1,
    },
  })

  // bk05: cap the party at the summed max occupancy of the selected rooms
  const occupancyCap = maxGuests && maxGuests > 0 ? maxGuests : 20
  const numGuestsValue = Number(watch("numGuests"))
  const occupancyExceeded = Number.isFinite(numGuestsValue) && numGuestsValue > occupancyCap

  function onValidSubmit(data: GuestData) {
    if (data.numGuests > occupancyCap) return // inline error is already shown
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Guest Details</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">Enter your details for the booking.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Full name *</label>
          <input
            id="fullName"
            placeholder="John Doe"
            className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
            {...register("fullName")}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName && (
            <p id="fullName-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Email *</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.email.message}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Phone *</label>
            <input
              id="phone"
              placeholder="e.g. +94769617372"
              className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              {...register("phone")}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="nationality" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Nationality</label>
            <input
              id="nationality"
              placeholder="Sri Lankan"
              className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
              {...register("nationality")}
              aria-invalid={!!errors.nationality}
              aria-describedby={errors.nationality ? "nationality-error" : undefined}
            />
            {errors.nationality && (
              <p id="nationality-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.nationality.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="nic_passport" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">NIC / Passport</label>
          <input
            id="nic_passport"
            placeholder="NIC or passport number"
            className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
            {...register("nic_passport")}
            aria-invalid={!!errors.nic_passport}
            aria-describedby={errors.nic_passport ? "nic_passport-error" : undefined}
          />
          {errors.nic_passport && (
            <p id="nic_passport-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.nic_passport.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="numGuests" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">How many guests? *</label>
          <input
            id="numGuests"
            type="number"
            min={1}
            max={Math.min(20, occupancyCap)}
            placeholder="2"
            className="w-full mt-1 h-9 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm font-sans text-stone-900 dark:text-stone-100 outline-none"
            {...register("numGuests")}
            aria-invalid={!!errors.numGuests || occupancyExceeded}
            aria-describedby={errors.numGuests || occupancyExceeded ? "numGuests-error" : undefined}
          />
          {errors.numGuests && (
            <p id="numGuests-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">{errors.numGuests.message}</p>
          )}
          {!errors.numGuests && occupancyExceeded && (
            <p id="numGuests-error" className="mt-1 text-sm text-red-500 font-sans" role="alert">
              Your selected rooms can accommodate up to {occupancyCap} {occupancyCap === 1 ? "guest" : "guests"} — please add more rooms or reduce the guest count.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">Back</button>
        <button type="submit" className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Next</button>
      </div>
    </form>
  )
}
