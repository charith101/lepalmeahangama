import { z } from "zod"

export const guestSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address").max(255, "Email must be 255 characters or less"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\+\-\(\)]{7,}$/, "Enter a valid phone number (e.g., +94 77 123 4567)")
    .max(50, "Phone must be 50 characters or less"),
  nationality: z.string()
    .min(1, "Nationality is required")
    .regex(/^[A-Za-z\s\-'\.]+$/, "Nationality should only contain letters and spaces")
    .max(100, "Nationality must be 100 characters or less"),
  nic_passport: z.string()
    .min(5, "NIC/Passport number is required")
    .regex(/^[A-Za-z0-9\-]+$/, "NIC/Passport can only contain letters, numbers, and hyphens")
    .max(20, "NIC/Passport must be 20 characters or less"),
})

export const dateStepSchema = z.object({
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  roomSelections: z.array(z.object({
    categoryId: z.string().uuid("Invalid category ID"),
    categoryName: z.string().min(1),
    basePrice: z.number().positive("Price must be positive"),
    maxOccupancy: z.number().int().positive(),
    quantity: z.number().int().positive("Quantity must be at least 1"),
    availableCount: z.number().int().nonnegative(),
    imageUrl: z.string().url().nullable().optional(),
  })).min(1, "Please select at least one room category"),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
})

export const extrasSchema = z.object({
  surfboardQty: z.number().int().min(0).max(20),
  bicycleQty: z.number().int().min(0).max(20),
  equipmentStart: z.string(),
  equipmentEnd: z.string(),
  transferNeeded: z.boolean(),
  transferDirection: z.enum(["arrival", "departure"]),
  flightNumber: z.string().max(50, "Flight number must be 50 characters or less"),
  transferTime: z.string(),
}).refine((data) => {
  if (data.equipmentStart && data.equipmentEnd) {
    return new Date(data.equipmentEnd) > new Date(data.equipmentStart)
  }
  return true
}, {
  message: "Equipment end date must be after start date",
  path: ["equipmentEnd"],
}).refine((data) => {
  if (data.transferNeeded && !data.transferTime) return false
  return true
}, {
  message: "Pickup time is required",
  path: ["transferTime"],
})

export const bookingLookupSchema = z.object({
  referenceCode: z.string().min(1, "Booking reference is required").max(50, "Reference code too long"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address").max(255, "Email must be 255 characters or less"),
})

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
})

export const dashboardBookingSchema = z.object({
  checkIn: z.date(),
  checkOut: z.date(),
  roomId: z.string().min(1, "Please select a room"),
  source: z.enum(["walk_in", "ota_manual"]),
  otaName: z.string().optional().or(z.literal("")),
  guestName: z.string().min(1, "Guest name is required").max(100, "Name must be 100 characters or less"),
  guestEmail: z.string().max(255, "Email must be 255 characters or less").optional().or(z.literal("")),
  guestPhone: z.string().max(50, "Phone must be 50 characters or less").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (!data.checkIn || !data.checkOut) return true
  return data.checkOut > data.checkIn
}, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
}).refine((data) => {
  if (data.source === "ota_manual" && !data.otaName?.trim()) return false
  return true
}, {
  message: "OTA name is required for OTA bookings",
  path: ["otaName"],
}).refine((data) => {
  if (data.guestEmail && data.guestEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(data.guestEmail)
  }
  return true
}, {
  message: "Invalid email format",
  path: ["guestEmail"],
})

export const chargeSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  category: z.enum(["meal", "late_checkout_fee", "transport", "misc"]),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
})

export const equipmentRentalSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  guestId: z.string().min(1, "Guest is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true
  return new Date(data.endDate) >= new Date(data.startDate)
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
})

export const transferSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  guestId: z.string().min(1, "Guest is required"),
  direction: z.enum(["arrival", "departure"]),
  flightNumber: z.string().max(50, "Flight number must be 50 characters or less").optional().or(z.literal("")),
  datetime: z.string().min(1, "Date and time is required"),
})

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["cash", "bank_transfer", "card_payhere", "card_polar"]),
})

export const settingsSchema = z.object({
  checkInTime: z.string().min(1, "Check-in time is required"),
  checkOutTime: z.string().min(1, "Check-out time is required"),
  surchargePct: z.number().min(0, "Must be 0 or higher").max(100, "Must be 100 or less"),
  minDepositPct: z.number().min(0, "Must be 0 or higher").max(100, "Must be 100 or less"),
})

export const addUnitSchema = z.object({
  unitLabel: z.string().min(1, "Unit label is required").max(100, "Label must be 100 characters or less"),
  categoryId: z.string().min(1, "Category is required"),
})

export const pricingUpdateSchema = z.object({
  basePriceUsd: z.number().min(0, "Price must be 0 or higher"),
})

export type GuestData = z.infer<typeof guestSchema>
export type DateStepData = z.infer<typeof dateStepSchema>
export type ExtrasData = z.infer<typeof extrasSchema>
export type BookingLookupData = z.infer<typeof bookingLookupSchema>
export type LoginData = z.infer<typeof loginSchema>
export type DashboardBookingData = z.infer<typeof dashboardBookingSchema>
export type ChargeData = z.infer<typeof chargeSchema>
export type EquipmentRentalData = z.infer<typeof equipmentRentalSchema>
export type TransferData = z.infer<typeof transferSchema>
export type RecordPaymentData = z.infer<typeof recordPaymentSchema>
export type SettingsData = z.infer<typeof settingsSchema>
export type AddUnitData = z.infer<typeof addUnitSchema>
