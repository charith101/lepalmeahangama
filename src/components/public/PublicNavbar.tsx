"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TreePalm } from "lucide-react"
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const pathname = usePathname()
  const isDashboard = pathname.startsWith("/dashboard")
  const isHome = pathname === "/"

  const prevPathnameRef = useRef(pathname)
  if (prevPathnameRef.current !== pathname) {
    prevPathnameRef.current = pathname
    if (open) setOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const scrolledPast = scrolled || !isHome

  const toggle = useCallback(() => setOpen((v) => !v), [])

  if (isDashboard) return null

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolledPast
            ? "bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800"
            : "bg-transparent"
          } ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      >
        <div className="flex items-center justify-between h-18 px-6 sm:px-12 max-w-8xl mx-auto">
          <Link href={isDashboard ? "/dashboard" : "/"} className="shrink-0">
            <span
              className={`flex items-center gap-2 text-xl font-serif font-normal tracking-wide ${
                scrolledPast ? "text-stone-900 dark:text-stone-100" : "text-white"
              }`}
            >
              <TreePalm className="size-6" />
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
                      className={`relative text-xs font-sans font-medium uppercase tracking-[0.15em] transition-colors duration-200 hover:opacity-70 after:absolute after:bottom-[-3px] after:left-0 after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100 ${
                        scrolledPast ? "text-stone-700 dark:text-stone-200" : "text-white/90"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/booking/lookup"
                    className={`relative text-xs font-sans font-medium uppercase tracking-[0.15em] transition-colors duration-200 hover:opacity-70 after:absolute after:bottom-[-3px] after:left-0 after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100 ${
                      scrolledPast ? "text-stone-500 dark:text-stone-400" : "text-white/70"
                    }`}
                  >
                    My Bookings
                  </Link>
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
                  onClick={toggle}
                  className={`relative flex size-10 items-center justify-center transition-colors ${
                    scrolledPast
                      ? "text-stone-700 dark:text-stone-300"
                      : "text-white/80"
                  }`}
                  aria-label={open ? "Close menu" : "Open menu"}
                >
                  <div className="flex flex-col items-center justify-center gap-1.25">
                    <span
                      className={`block h-px w-5 bg-current transition-all duration-300 origin-center ${
                        open ? "rotate-45 translate-y-1.5" : ""
                      }`}
                    />
                    <span
                      className={`block h-px w-5 bg-current transition-all duration-300 ${
                        open ? "opacity-0 scale-x-0" : ""
                      }`}
                    />
                    <span
                      className={`block h-px w-5 bg-current transition-all duration-300 origin-center ${
                        open ? "-rotate-45 -translate-y-1.5" : ""
                      }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        className={`fixed top-0 left-0 right-0 z-40 pt-18 transition-all duration-400 ease-out lg:hidden ${
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        } ${
          scrolledPast
            ? "bg-white/95 dark:bg-stone-950/95 border-b border-stone-200 dark:border-stone-800"
            : "bg-black/90 backdrop-blur-sm border-b border-white/10"
        }`}
      >
        <div className="px-6 pb-8 pt-4 max-w-8xl mx-auto">
          <div className="space-y-1">
            {navLinks.map((link, i) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`relative block py-3 text-base font-sans font-medium transition-all duration-300 border-l-2 border-transparent hover:border-current pl-4 -ml-4 after:absolute after:bottom-0 after:left-4 after:h-px after:w-[calc(100%-1rem)] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100 ${
                  scrolledPast
                    ? "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                    : "text-white/80 hover:text-white"
                }`}
                style={{
                  transitionDelay: mounted && open ? `${i * 50}ms` : "0ms",
                  transform: mounted && open ? "translateX(0)" : "translateX(-12px)",
                  opacity: mounted && open ? 1 : 0,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className={`my-4 h-px transition-opacity duration-300 ${
              scrolledPast ? "bg-stone-200 dark:bg-stone-800" : "bg-white/20"
            }`}
            style={{
              transitionDelay: mounted && open ? "200ms" : "0ms",
              opacity: mounted && open ? 1 : 0,
            }}
          />

          <Link
            href="/booking/lookup"
            onClick={() => setOpen(false)}
            className={`relative block py-3 text-base font-sans font-medium transition-all duration-300 border-l-2 border-transparent hover:border-current pl-4 -ml-4 after:absolute after:bottom-0 after:left-4 after:h-px after:w-[calc(100%-1rem)] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100 ${
              scrolledPast
                ? "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                : "text-white/70 hover:text-white"
            }`}
            style={{
              transitionDelay: mounted && open ? "250ms" : "0ms",
              transform: mounted && open ? "translateX(0)" : "translateX(-12px)",
              opacity: mounted && open ? 1 : 0,
            }}
          >
            My Bookings
          </Link>

          <Link
            href="/booking"
            onClick={() => setOpen(false)}
            className={`block py-3 text-base font-sans font-semibold transition-all duration-300 border-l-2 border-transparent hover:border-current pl-4 -ml-4 ${
              scrolledPast
                ? "text-stone-900 dark:text-stone-100"
                : "text-white"
            }`}
            style={{
              transitionDelay: mounted && open ? "300ms" : "0ms",
              transform: mounted && open ? "translateX(0)" : "translateX(-12px)",
              opacity: mounted && open ? 1 : 0,
            }}
          >
            Book Now
          </Link>
        </div>
      </div>
    </>
  )
}
