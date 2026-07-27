"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, TreePalm } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

const navLinks = [
  { label: "Stay", href: "/rooms" },
  { label: "Dine", href: "/dine" },
  { label: "Experiences", href: "/experiences" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
]

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isDashboard = pathname.startsWith("/dashboard")
  const isHome = pathname === "/"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrolledPast = scrolled || !isHome

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolledPast
          ? "bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between h-18 px-8 sm:px-12 max-w-8xl mx-auto">
        <Link href={isDashboard ? "/dashboard" : "/"} className="shrink-0">
          <span
            className={`flex items-center gap-2 text-lg font-serif font-normal tracking-wide ${
              scrolledPast ? "text-stone-900 dark:text-stone-100" : "text-white"
            }`}
          >
            <TreePalm className="size-5" />
            Le Palme
          </span>
        </Link>

        <div className="flex items-center gap-10">
          {!isDashboard && (
            <div className="hidden lg:flex items-center gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs font-sans font-medium uppercase tracking-[0.15em] transition-colors duration-200 hover:opacity-70 ${
                    scrolledPast ? "text-stone-700 dark:text-stone-300" : "text-white/80"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/booking"
                className={`px-5 py-2 text-xs font-sans font-medium uppercase tracking-[0.15em] transition-colors duration-200 ${
                  scrolledPast
                    ? "bg-stone-900 dark:bg-stone-800 text-white hover:bg-stone-800 dark:hover:bg-stone-700"
                    : "border border-white text-white hover:bg-white/10"
                }`}
              >
                Book Now
              </Link>
              <AnimatedThemeToggler
                className={`flex size-8 items-center justify-center transition-colors ${
                  scrolledPast
                    ? "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                    : "text-white/70 hover:text-white"
                }`}
              />
            </div>
          )}

          {!isDashboard && (
            <div className="flex items-center gap-2 lg:hidden">
              <AnimatedThemeToggler
                className={`flex size-8 items-center justify-center transition-colors ${
                  scrolledPast
                    ? "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                    : "text-white/70 hover:text-white"
                }`}
              />
              <button
                onClick={() => setOpen(!open)}
                className={`flex size-10 items-center justify-center transition-colors ${
                  scrolledPast
                    ? "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                    : "text-white/80 hover:text-white"
                }`}
                aria-label={open ? "Close menu" : "Open menu"}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {open && !isDashboard && (
        <div
          className={`lg:hidden border-t px-6 pb-6 pt-4 space-y-1 ${
            scrolledPast
              ? "bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800"
              : "bg-black/90 border-white/10"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block py-2 text-sm font-sans font-medium transition-colors ${
                scrolledPast
                  ? "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/booking"
            onClick={() => setOpen(false)}
            className={`block py-2 text-sm font-sans font-medium transition-colors ${
              scrolledPast
                ? "text-stone-900 dark:text-stone-100 font-semibold"
                : "text-white"
            }`}
          >
            Book Now
          </Link>
        </div>
      )}
    </nav>
  )
}
