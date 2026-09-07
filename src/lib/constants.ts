export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const HOTEL_NAME = "Le Palme Ahangama"
export const HOTEL_PHONE_DISPLAY = "0769617372"
export const HOTEL_PHONE_TEL = "+94769617372"
export const HOTEL_EMAIL = "info@lepalmeahangama.com"

export const HOTEL_ADDRESS_STREET = "Ruwan Villa, Kahawathugoda"
export const HOTEL_ADDRESS_LOCALITY = "Ahangama"
export const HOTEL_ADDRESS_REGION = "Southern Province"
export const HOTEL_ADDRESS_COUNTRY = "Sri Lanka"
export const HOTEL_ADDRESS_FULL = `${HOTEL_ADDRESS_STREET}, ${HOTEL_ADDRESS_LOCALITY}, ${HOTEL_ADDRESS_COUNTRY}`

export const HOTEL_LATITUDE = 5.978959218567139
export const HOTEL_LONGITUDE = 80.36230480227772

export const HOTEL_DESCRIPTION =
  "Le Palme Ahangama offers family rooms with private bathrooms, balconies, and garden views, plus air-conditioning, a work desk, and free WiFi. Relax on the sun terrace or in the garden, enjoy the lounge, outdoor fireplace, and children's playground, and choose from a shared kitchen, coffee shop, and outdoor seating area. Start each morning with a full English or Irish breakfast with vegetarian and Asian options, plus local specialties, warm dishes, fresh pastries, and fruits."

export const HOTEL_SHORT_DESCRIPTION =
  "A charming boutique property in Ahangama, Sri Lanka — comfortable rooms, lush gardens, sun terrace, and a friendly host near Kabalana Beach."

export const HOTEL_MAP_EMBED_URL =
  `https://www.google.com/maps?q=${HOTEL_LATITUDE},${HOTEL_LONGITUDE}&hl=en&z=15&output=embed`
export const HOTEL_MAP_LINK =
  `https://www.google.com/maps?q=${HOTEL_LATITUDE},${HOTEL_LONGITUDE}`

export const CATEGORY_DELUXE = "51d3cabe-51d3-49aa-a0ac-80c4d7c22f27"
export const CATEGORY_BUDGET = "a9dde668-cc67-483b-ad82-bb38e4e266b9"
export const ROUTE_CMB = "4f4afe58-cd2d-4c92-a55e-4bfa33c32c7e"
export const EQUIPMENT_SURFBOARD = "3566e726-1845-4cbb-966a-ba200c105f3a"
export const EQUIPMENT_BICYCLE = "1d5c15cc-59b3-410c-88a5-562a7b006f4f"

export const MOTORBIKE_CATEGORIES = {
  tvs_ntorq: "5f3d27c4-39d7-471d-91e7-a9484f2e3c78",
  honda_dio: "baee05a2-9004-4e64-ac9b-5bec102dac90",
  honda_navi: "55c877a5-4fd6-4ae5-bf42-b4bfab83b8ef",
} as const

export const CAR_CATEGORIES = {
  wagonR: "c640dd05-7312-4c2a-9136-a656e6f74461",
  hustler: "c48f58af-6842-46f0-bc77-ae964fe37f15",
  aqua: "311fcc0c-d672-4e80-a38d-2d90f1c0111a",
  fit_gp5: "9bdd0957-d5ce-44f0-aacc-228f37617ce3",
  prius: "667a9b1d-65b4-463f-bbc8-5276423e8aeb",
  vezel: "063d8b23-a9de-4b92-b2c0-ee3952f716b2",
  fit_shuttle: "bfb8a025-70cf-4e70-a247-08116dec3f7a",
  every: "a415ed6c-1d51-4b10-b569-51aeeca3c224",
} as const

export type BoardPlan = "room_only" | "half_board" | "full_board"

export const BOARD_PLANS: ReadonlyArray<{ key: BoardPlan; label: string; pricePerNight: number; description: string }> = [
  { key: "room_only", label: "Room Only", pricePerNight: 0, description: "Accommodation only — no meals included." },
  { key: "half_board", label: "Half Board", pricePerNight: 10, description: "Daily breakfast and dinner at our ocean-view restaurant." },
  { key: "full_board", label: "Full Board", pricePerNight: 20, description: "Breakfast, lunch, and dinner every day of your stay." },
]

export const BOARD_LABEL = (plan: string): string =>
  BOARD_PLANS.find((p) => p.key === plan)?.label ?? "Room Only"

export const BOARD_PRICE_PER_NIGHT = (plan: string): number =>
  BOARD_PLANS.find((p) => p.key === plan)?.pricePerNight ?? 0

// ponytail: tiered surfboard pricing. Returns total USD for `days` of rental.
// Falls back to the legacy single-rate column when tiered_pricing is null.
// Tier shape: { min_days, max_days (nullable for "and up"), price_per_day_usd }
type Tier = { min_days: number; max_days: number | null; price_per_day_usd: number }
export type TieredPricing = { tiers: Tier[] }

export function surfboardTotalForDays(days: number, fallbackPerDay: number, tiered?: TieredPricing | null): number {
  if (days <= 0) return 0
  if (!tiered?.tiers?.length) return days * fallbackPerDay
  const sorted = [...tiered.tiers].sort((a, b) => a.min_days - b.min_days)
  // Find the tier that covers `days`. Tiers must be contiguous and ascending.
  const tier = sorted.find((t) => days >= t.min_days && (t.max_days === null || days <= t.max_days))
    ?? sorted[sorted.length - 1]
  return days * tier.price_per_day_usd
}

export const SURFBOARD_TIERS: TieredPricing = {
  tiers: [
    { min_days: 1,  max_days: 6,   price_per_day_usd: 25 },
    { min_days: 7,  max_days: 13,  price_per_day_usd: 14 },
    { min_days: 14, max_days: 20,  price_per_day_usd: 12 },
    { min_days: 21, max_days: null, price_per_day_usd: 11 },
  ],
}

export function isSurfboardTiered(categoryId: string): boolean {
  return categoryId === EQUIPMENT_SURFBOARD
}
