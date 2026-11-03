// Hotel-local (Asia/Colombo, UTC+5:30) date/time helpers.
// ponytail: one file, used by transfer storage, timeline and guest-facing pages
// so times never drift between panels again.

export const HOTEL_TZ = "Asia/Colombo"
export const HOTEL_TZ_OFFSET = "+05:30"

/**
 * Interpret a `datetime-local` input value ("YYYY-MM-DDTHH:mm", hotel local)
 * as hotel time and return a UTC ISO string for storage in a `timestamptz` column.
 */
export function hotelLocalToUtcIso(localValue: string): string {
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue
  return new Date(`${normalized}${HOTEL_TZ_OFFSET}`).toISOString()
}

/** True when a stored ISO timestamp falls on the given hotel-local date (YYYY-MM-DD). */
export function isHotelDate(iso: string, date: string): boolean {
  return hotelDate(iso) === date
}

/** Hotel-local date (YYYY-MM-DD) of a stored ISO timestamp. */
export function hotelDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

/** "Oct 29, 2026, 6:45 PM" in hotel time — replaces raw ISO strings in UI. */
export function formatHotelDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOTEL_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** "6:45 PM" in hotel time (timeline rows, transfer lists). */
export function formatHotelTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOTEL_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}
