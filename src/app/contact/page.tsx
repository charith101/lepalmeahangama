"use client"

import { useState } from "react"
import { Mail, Phone, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function ContactPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("All fields are required")
      return
    }
    setLoading(true)
    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    })
    setLoading(false)
    if (error) {
      toast.error("Failed to send message. Please try again.")
      return
    }
    setSent(true)
    setName("")
    setEmail("")
    setMessage("")
    toast.success("Message sent! We'll get back to you soon.")
  }

  if (sent) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <section className="px-6 py-20 sm:py-28">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-4">
              Thank You
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans">
              Your message has been sent. We&apos;ll get back to you soon.
            </p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-stone-400 dark:text-stone-500 mb-4">
                Contact
              </p>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-serif font-normal leading-[1.1] text-stone-900 dark:text-stone-100 mb-6">
                Get in Touch
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base font-sans leading-relaxed mb-10">
                Whether you&apos;re planning a stay, curious about our experiences,
                or simply want to say hello — we&apos;d love to hear from you.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <MapPin className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Address</h3>
                    <p className="text-sm font-sans text-stone-500 dark:text-stone-400 leading-relaxed">
                      Ahangama Beach Road<br />
                      Ahangama, Southern Province<br />
                      Sri Lanka
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <Phone className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Phone</h3>
                    <a href="tel:+94-XXX-XXXXXX" className="text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                      +94-XXX-XXXXXX
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800">
                    <Mail className="size-4 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100 mb-1">Email</h3>
                    <a href="mailto:info@lepalmeahangama.com" className="text-sm font-sans text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                      info@lepalmeahangama.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors resize-none"
                    placeholder="How can we help you?"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-3 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
