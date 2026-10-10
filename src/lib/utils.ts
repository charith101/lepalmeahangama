import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function rentalDays(start?: string, end?: string, fallback: number = 0): number {
  if (!start || !end) return Math.max(0, fallback)
  const startMs = new Date(start + "T12:00:00").getTime()
  const endMs = new Date(end + "T12:00:00").getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return Math.max(0, fallback)
  const days = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
  if (days < 0) return 0
  return Math.max(1, days)
}
