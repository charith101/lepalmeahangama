import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the privacy policy of Le Palme Ahangama, a boutique hotel in Ahangama, Sri Lanka.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
            Privacy Policy
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xs font-sans text-stone-400 dark:text-stone-500 mb-10">
            Last updated: August 11, 2026
          </p>
          <div className="space-y-10 text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed">
            <p>
              At Le Palme Ahangama, we are committed to protecting the privacy and
              security of our guests&apos; personal information. This Privacy Policy
              outlines how we collect, use, and safeguard your information when you
              visit our website or make a booking. By using our website, you consent to
              the practices described in this policy.
            </p>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Information We Collect
              </h2>
              <p>When you visit our website, we may collect certain information about you, including:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Personal identification information (such as your name, email address,
                  phone number, and country of residence) provided voluntarily by you
                  during the booking process.
                </li>
                <li>
                  Payment and billing information necessary to process your bookings,
                  including credit card details, which are securely handled by our
                  trusted third-party payment processor, PayHere.
                </li>
                <li>
                  Browsing information, such as your IP address, browser type, and
                  device information, collected automatically using cookies and similar
                  technologies.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Use of Information
              </h2>
              <p>We may use the collected information for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>To process and confirm your bookings.</li>
                <li>
                  To communicate with you regarding your reservation, provide customer
                  support, and respond to inquiries or requests.
                </li>
                <li>
                  To personalize your experience and present relevant offers and
                  promotions.
                </li>
                <li>
                  To improve our website, rooms, and services based on your feedback and
                  browsing patterns.
                </li>
                <li>
                  To detect and prevent fraud, unauthorized activities, and abuse of our
                  website.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Information Sharing
              </h2>
              <p>
                We respect your privacy and do not sell, trade, or otherwise transfer
                your personal information to third parties without your consent, except
                in the following circumstances:
              </p>
              <p>
                <span className="text-stone-900 dark:text-stone-100 font-medium">Trusted service providers:</span>{" "}
                We may share your information with third-party service providers who
                assist us in operating our website, processing payments, and delivering
                services. These providers are contractually obligated to handle your
                data securely and confidentially.
              </p>
              <p>
                <span className="text-stone-900 dark:text-stone-100 font-medium">Legal requirements:</span>{" "}
                We may disclose your information if required to do so by law or in
                response to valid legal requests or orders.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Data Security
              </h2>
              <p>
                We implement industry-standard security measures to protect your personal
                information from unauthorized access, alteration, disclosure, or
                destruction. However, please be aware that no method of transmission over
                the internet or electronic storage is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Cookies and Tracking Technologies
              </h2>
              <p>
                We use cookies and similar technologies to enhance your browsing
                experience, analyze website traffic, and gather information about your
                preferences and interactions with our website. You have the option to
                disable cookies through your browser settings, but this may limit certain
                features and functionality of our website.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Changes to the Privacy Policy
              </h2>
              <p>
                We reserve the right to update or modify this Privacy Policy at any time.
                Any changes will be posted on this page with a revised &quot;last
                updated&quot; date. We encourage you to review this Privacy Policy
                periodically to stay informed about how we collect, use, and protect your
                information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-4">
                Contact Us
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy
                Policy or the handling of your personal information, please contact us at{" "}
                <a
                  href="mailto:lepalmeahangama@protonmail.com"
                  className="text-stone-900 dark:text-stone-100 underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  lepalmeahangama@protonmail.com
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
