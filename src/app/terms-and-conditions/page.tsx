import type { Metadata } from "next"
import { HOTEL_EMAIL } from "@/lib/constants"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Terms and Conditions",
  description: "Read the terms and conditions for bookings at Le Palme Ahangama, a boutique hotel in Ahangama, Sri Lanka.",
  path: "/terms-and-conditions",
})

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Terms &amp; Conditions
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">
            Terms and Conditions
          </h1>
          <p className="text-xs font-sans text-stone-400 dark:text-stone-500 mb-10">
            Last updated: August 11, 2026
          </p>
          <div className="space-y-10 text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed">
            <p>
              Welcome to Le Palme Ahangama. These Terms and Conditions govern your use
              of our website and the booking of rooms and services at our property. By
              accessing and using our website, you agree to comply with these terms.
              Please read them carefully before proceeding with any bookings.
            </p>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Use of the Website
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be at least 18 years old to use our website or make bookings.</li>
                <li>
                  You are responsible for maintaining the confidentiality of your account
                  information, including your username and password.
                </li>
                <li>
                  You agree to provide accurate and current information during the
                  booking process.
                </li>
                <li>You may not use our website for any unlawful or unauthorized purposes.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Product Information and Pricing
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  We strive to provide accurate descriptions, images, and pricing
                  information for our rooms and services. However, we do not guarantee
                  the accuracy or completeness of such information.
                </li>
                <li>
                  Prices are subject to change without notice. Any promotions or discounts
                  are valid for a limited time and may be subject to additional terms and
                  conditions.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Bookings and Payments
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  By placing a booking on our website, you are making an offer to
                  purchase the selected rooms and services.
                </li>
                <li>
                  We reserve the right to refuse or cancel any booking for any reason,
                  including but not limited to availability, errors in pricing or
                  information, or suspected fraudulent activity.
                </li>
                <li>
                  You agree to provide valid and up-to-date payment information and
                  authorize us to charge the total booking amount, including applicable
                  taxes and fees, to your chosen payment method.
                </li>
                <li>
                  We use trusted third-party payment processors to handle your payment
                  information securely. We do not store or have access to your full
                  payment details.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Cancellations and Refunds
              </h2>
              <p>
                Our Cancellation and Refund Policy governs the process and conditions for
                cancelling bookings and seeking refunds. Please refer to our{" "}
                <a
                  href="/refund-policy"
                  className="text-stone-900 dark:text-stone-100 underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  Refund Policy
                </a>{" "}
                for more information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Intellectual Property
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  All content and materials on our website, including but not limited to
                  text, images, logos, and graphics, are protected by intellectual
                  property rights and are the property of Le Palme Ahangama or its
                  licensors.
                </li>
                <li>
                  You may not use, reproduce, distribute, or modify any content from our
                  website without our prior written consent.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Limitation of Liability
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  In no event shall Le Palme Ahangama, its directors, employees, or
                  affiliates be liable for any direct, indirect, incidental, special, or
                  consequential damages arising out of or in connection with your use of
                  our website or the booking and use of our rooms and services.
                </li>
                <li>
                  We make no warranties or representations, express or implied, regarding
                  the quality, accuracy, or suitability of the rooms and services offered
                  on our website.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Amendments and Termination
              </h2>
              <p>
                We reserve the right to modify, update, or terminate these Terms and
                Conditions at any time without prior notice. It is your responsibility to
                review these terms periodically for any changes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Contact Us
              </h2>
              <p>
                If you have any questions regarding these Terms and Conditions, please
                contact us at{" "}
                <a
                  href={`mailto:${HOTEL_EMAIL}`}
                  className="text-stone-900 dark:text-stone-100 underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  {HOTEL_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
