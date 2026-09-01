"use client"

import { useState } from "react"

export function NewsletterSection() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    setName("")
    setEmail("")
  }

  if (submitted) {
    return (
      <section className="py-20 sm:py-28 px-6 bg-white dark:bg-stone-950">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-3">
            Thank You!
          </h3>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-sans leading-relaxed">
            You&apos;ve been subscribed to our newsletter.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 sm:py-28 px-6 bg-white dark:bg-stone-950">
      <div className="max-w-xl mx-auto text-center">
        <h3 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-3">
          Stay in Touch
        </h3>
        <p className="text-stone-500 dark:text-stone-400 text-sm font-sans leading-relaxed mb-10">
          Be the first to know about special offers, new experiences, and
          stories from Le Palme.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 text-sm font-sans text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
          />
          <button
            type="submit"
            className="w-full px-8 py-3 bg-stone-900 dark:bg-stone-800 text-white text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
          >
            Sign Up
          </button>
        </form>
      </div>
    </section>
  )
}
