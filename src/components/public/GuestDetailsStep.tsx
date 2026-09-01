"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { guestSchema, type GuestData } from "@/lib/validations"

export type { GuestData }

type GuestDetailsStepProps = {
  onNext: (data: GuestData) => void
  onBack: () => void
  initialData?: Partial<GuestData>
}

export function GuestDetailsStep({ onNext, onBack, initialData }: GuestDetailsStepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<GuestData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullName: initialData?.fullName ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      nationality: initialData?.nationality ?? "",
      nic_passport: initialData?.nic_passport ?? "",
    },
  })

  function onValidSubmit(data: GuestData) {
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
            <label htmlFor="phone" className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">Phone</label>
            <input
              id="phone"
              placeholder="+94-XXX-XXXXXX"
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
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">Back</button>
        <button type="submit" className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Next</button>
      </div>
    </form>
  )
}
