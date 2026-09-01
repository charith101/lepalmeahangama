"use client"

import * as React from "react"

export function Clock() {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span
      suppressHydrationWarning
      className="inline-flex items-center text-sm text-muted-foreground tabular-nums"
      aria-label="Current time"
    >
      {now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}
    </span>
  )
}
