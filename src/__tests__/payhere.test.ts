import { describe, expect, it } from "vitest"
import {
  generateHash,
  groupIdFromOrderId,
  isPayHereFailureStatus,
  orderIdFromGroupId,
  verifyNotification,
} from "@/lib/payhere"

// Vectors generated with PayHere's documented formula:
//   hash   = upper(md5(merchant_id + order_id + amount + currency + upper(md5(secret))))
//   md5sig = upper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + upper(md5(secret))))
const MERCHANT_ID = "1236547"
const MERCHANT_SECRET = "test_secret_value"
const ORDER_ID = "BOOK-11111111-1111-1111-1111-111111111111"
const AMOUNT = "21.00"
const CURRENCY = "USD"
const HASH = "CC5FBFC13C662ACF742AFE7683E5DAFF"
const SIG_SUCCESS = "7674B38D0408BC7C0C85AC6BDFC95B44"
const SIG_CANCELLED = "955A6C8E666A6AE2EA96013FCF4AC62E"

describe("generateHash", () => {
  it("matches PayHere's documented hash", () => {
    expect(generateHash(MERCHANT_ID, ORDER_ID, AMOUNT, CURRENCY, MERCHANT_SECRET)).toBe(HASH)
  })

  it("formats the amount to two decimals", () => {
    expect(generateHash(MERCHANT_ID, ORDER_ID, "21", CURRENCY, MERCHANT_SECRET)).toBe(HASH)
  })
})

describe("verifyNotification", () => {
  it("accepts a signature PayHere would send for a successful payment", () => {
    expect(
      verifyNotification(MERCHANT_ID, ORDER_ID, AMOUNT, CURRENCY, "2", SIG_SUCCESS, MERCHANT_SECRET),
    ).toBe(true)
  })

  it("accepts signatures for non-success status codes", () => {
    expect(
      verifyNotification(MERCHANT_ID, ORDER_ID, AMOUNT, CURRENCY, "-1", SIG_CANCELLED, MERCHANT_SECRET),
    ).toBe(true)
  })

  it("rejects a tampered amount", () => {
    expect(
      verifyNotification(MERCHANT_ID, ORDER_ID, "1.00", CURRENCY, "2", SIG_SUCCESS, MERCHANT_SECRET),
    ).toBe(false)
  })

  it("rejects a lowercase or padded signature only after normalising it", () => {
    expect(
      verifyNotification(
        MERCHANT_ID,
        ORDER_ID,
        AMOUNT,
        CURRENCY,
        "2",
        ` ${SIG_SUCCESS.toLowerCase()} `,
        MERCHANT_SECRET,
      ),
    ).toBe(true)
  })

  it("never verifies when the merchant secret is missing", () => {
    expect(verifyNotification(MERCHANT_ID, ORDER_ID, AMOUNT, CURRENCY, "2", SIG_SUCCESS, "")).toBe(false)
  })
})

describe("order reference helpers", () => {
  it("round-trips a group booking id", () => {
    const groupId = "a04c0e45-65d2-4ff6-8063-51c36f853bf1"
    expect(groupIdFromOrderId(orderIdFromGroupId(groupId))).toBe(groupId)
  })

  it("rejects malformed order ids", () => {
    expect(groupIdFromOrderId("BOOK-not-a-uuid")).toBeNull()
    expect(groupIdFromOrderId("ORDER-a04c0e45-65d2-4ff6-8063-51c36f853bf1")).toBeNull()
    expect(groupIdFromOrderId("")).toBeNull()
  })
})

describe("isPayHereFailureStatus", () => {
  it("treats cancelled, failed and chargebacked as failures", () => {
    expect(isPayHereFailureStatus("-1")).toBe(true)
    expect(isPayHereFailureStatus("-2")).toBe(true)
    expect(isPayHereFailureStatus("-3")).toBe(true)
  })

  it("does not treat success or pending as a failure", () => {
    expect(isPayHereFailureStatus("2")).toBe(false)
    expect(isPayHereFailureStatus("0")).toBe(false)
    expect(isPayHereFailureStatus("1")).toBe(false)
  })
})
