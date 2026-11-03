import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with Le Palme Ahangama — address, phone, email, and directions to our boutique hotel in Ahangama, Sri Lanka.",
  path: "/contact",
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
