import type { Metadata } from "next"
import { LookupForm } from "./lookup-form"

export const metadata: Metadata = {
  title: "View My Booking",
  description: "Enter your booking reference code and email to view your reservation details at Le Palme Ahangama.",
  robots: { index: false, follow: true },
}

export default function BookingLookupPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground mb-2">Guest Services</p>
          <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-light leading-[1.14] text-ink dark:text-on-primary">View My Booking</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the booking reference code from your confirmation email and the email address you used to book.
          </p>
        </div>
        <LookupForm />
      </div>
    </div>
  )
}
