"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lookupBookingByRef } from "@/lib/actions/bookings"
import { bookingLookupSchema } from "@/lib/validations"

export function LookupForm() {
  const router = useRouter()
  const [referenceCode, setReferenceCode] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<{ referenceCode?: string; email?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = bookingLookupSchema.safeParse({ referenceCode, email })
    if (!result.success) {
      const fieldErrors: { referenceCode?: string; email?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === "referenceCode") fieldErrors.referenceCode = issue.message
        if (issue.path[0] === "email") fieldErrors.email = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const lookupResult = await lookupBookingByRef(result.data.referenceCode, result.data.email)
      if (lookupResult.error) {
        setErrors({ general: lookupResult.error })
        setLoading(false)
        return
      }
      if (!lookupResult.data?.[0]?.group_booking_id) {
        setErrors({ general: "Booking not found" })
        setLoading(false)
        return
      }
      router.push(`/booking/${lookupResult.data[0].group_booking_id}?email=${encodeURIComponent(result.data.email)}`)
    } catch {
      setErrors({ general: "Something went wrong. Please try again." })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="referenceCode" className="text-sm font-medium text-ink dark:text-on-primary">
          Booking Reference Code *
        </Label>
        <Input
          id="referenceCode"
          placeholder="e.g. A1B2C3D4"
          value={referenceCode}
          onChange={(e) => { setReferenceCode(e.target.value); setErrors({}) }}
          className="mt-1 font-mono tracking-wider uppercase"
          maxLength={50}
          aria-invalid={!!errors.referenceCode}
          aria-describedby={errors.referenceCode ? "ref-error" : undefined}
        />
        {errors.referenceCode && (
          <p id="ref-error" className="mt-1 text-sm text-destructive" role="alert">{errors.referenceCode}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Found in your confirmation email or WhatsApp message.
        </p>
      </div>

      <div>
        <Label htmlFor="lookupEmail" className="text-sm font-medium text-ink dark:text-on-primary">
          Email Address *
        </Label>
        <Input
          id="lookupEmail"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors({}) }}
          className="mt-1"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-destructive" role="alert">{errors.email}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          The email you used when making this booking.
        </p>
      </div>

      {errors.general && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {errors.general}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full rounded-pill h-11">
        <Search data-icon="inline-start" />
        {loading ? "Looking up..." : "View My Booking"}
      </Button>
    </form>
  )
}
