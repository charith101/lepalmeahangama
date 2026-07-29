import { describe, it, expect } from "vitest"
import crypto from "crypto"
import { generateHash, verifyNotification } from "@/lib/payhere"

function md5Upper(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex").toUpperCase()
}

function notificationHash(merchantId: string, orderId: string, amount: string, currency: string, statusCode: string, secret: string): string {
  const amountFormatted = Number(amount).toFixed(2)
  return md5Upper(merchantId + orderId + amountFormatted + currency + statusCode + md5Upper(secret))
}

describe("generateHash", () => {
  it("returns uppercase MD5 hash matching PayHere format", () => {
    const hash = generateHash("1236547", "BOOK-ABC12345", "1500.00", "USD", "test_secret")
    expect(hash).toMatch(/^[A-F0-9]{32}$/)
  })

  it("formats amount to 2 decimal places", () => {
    const hash100 = generateHash("1236547", "ORDER-1", "100", "USD", "secret")
    const hash100_2 = generateHash("1236547", "ORDER-1", "100.00", "USD", "secret")
    expect(hash100).toBe(hash100_2)
  })

  it("produces same hash for same inputs", () => {
    const hash1 = generateHash("1236547", "ORDER-1", "99.99", "USD", "my_secret")
    const hash2 = generateHash("1236547", "ORDER-1", "99.99", "USD", "my_secret")
    expect(hash1).toBe(hash2)
  })

  it("produces different hash for different secret", () => {
    const hash1 = generateHash("1236547", "ORDER-1", "50.00", "USD", "secret1")
    const hash2 = generateHash("1236547", "ORDER-1", "50.00", "USD", "secret2")
    expect(hash1).not.toBe(hash2)
  })
})

describe("verifyNotification", () => {
  const merchantId = "1236547"
  const orderId = "BOOK-ABC12345"
  const amount = "1500.00"
  const currency = "USD"
  const secret = "test_secret"

  it("returns true for a valid signature with status_code 2", () => {
    const validMd5sig = notificationHash(merchantId, orderId, amount, currency, "2", secret)
    expect(verifyNotification(merchantId, orderId, amount, currency, "2", validMd5sig, secret)).toBe(true)
  })

  it("returns true for a valid signature with status_code -1", () => {
    const validMd5sig = notificationHash(merchantId, orderId, amount, currency, "-1", secret)
    expect(verifyNotification(merchantId, orderId, amount, currency, "-1", validMd5sig, secret)).toBe(true)
  })

  it("returns false when md5sig does not match", () => {
    expect(verifyNotification(merchantId, orderId, amount, currency, "2", "INVALIDSIG12345678901234567890", secret)).toBe(false)
  })

  it("returns false with wrong secret", () => {
    const wrongHash = notificationHash(merchantId, orderId, amount, currency, "2", "wrong_secret")
    expect(verifyNotification(merchantId, orderId, amount, currency, "2", wrongHash, secret)).toBe(false)
  })

  it("returns false with wrong amount", () => {
    const origHash = notificationHash(merchantId, orderId, amount, currency, "2", secret)
    expect(verifyNotification(merchantId, orderId, "2000.00", currency, "2", origHash, secret)).toBe(false)
  })
})
