import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Read the cancellation and refund policy for bookings at Le Palme Ahangama, a beachfront hotel in Ahangama, Sri Lanka.",
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Refund Policy
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">
            Refund Policy
          </h1>
          <p className="text-xs font-sans text-stone-400 dark:text-stone-500 mb-10">
            Last updated: August 11, 2026
          </p>
          <div className="space-y-10 text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed">
            <p>
              Thank you for booking your stay at Le Palme Ahangama. We value your
              satisfaction and strive to provide you with a memorable experience. If,
              for any reason, you need to cancel or change your reservation, we are
              here to help.
            </p>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Bookings and Payment
              </h2>
              <p>
                When you make a booking through our website, you authorize Le Palme
                Ahangama to charge the total amount to your chosen payment method. All
                online payments are processed securely by PayHere, our trusted
                third-party payment processor.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Free Cancellation
              </h2>
              <p>
                You may cancel your reservation free of charge up to 7 days before your
                scheduled check-in date. If you cancel within this period, you will
                receive a full refund of any amount paid.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Late Cancellations
              </h2>
              <p>
                For cancellations made within 7 days of your scheduled check-in date,
                the full booking amount will be charged. No refund will be issued for
                cancellations made during this period.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                No-Shows
              </h2>
              <p>
                If you do not arrive on your scheduled check-in date and have not
                contacted us to cancel, you will be treated as a no-show and the full
                booking amount will be charged.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Refunds
              </h2>
              <p>
                Once a refund is approved, we will initiate it to your original method
                of payment. Refunds are typically processed within 7 business days.
                Depending on your bank or payment provider, it may take additional time
                for the refund to appear in your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Contact Us
              </h2>
              <p>
                If you have any questions or concerns regarding our refund policy,
                please contact us at{" "}
                <a
                  href="mailto:lepalmeahangama@protonmail.com"
                  className="text-stone-900 dark:text-stone-100 underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  lepalmeahangama@protonmail.com
                </a>
                . We are here to assist you and ensure your stay with us is enjoyable
                and hassle-free.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
