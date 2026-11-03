"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// While a booking is still waiting for PayHere's server-to-server notification,
// re-render the server page every few seconds so the status badge flips to
// "Confirmed" on its own. Stops after ~2 minutes; the guest can always reload.
const INTERVAL_MS = 4000
const MAX_CHECKS = 30

export function StatusRefresher() {
  const router = useRouter()
  const checks = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      checks.current += 1
      if (checks.current > MAX_CHECKS) {
        clearInterval(timer)
        return
      }
      router.refresh()
    }, INTERVAL_MS)

    return () => clearInterval(timer)
  }, [router])

  return null
}
