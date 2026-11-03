import crypto from "crypto"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// PayHere status codes from the Checkout API notification:
// 2 = success, 0 = pending, -1 = cancelled, -2 = failed, -3 = chargeback.
export const PAYHERE_STATUS_SUCCESS = "2"
const PAYHERE_FAILURE_STATUSES = new Set(["-1", "-2", "-3"])

export function isPayHereFailureStatus(statusCode: string): boolean {
  return PAYHERE_FAILURE_STATUSES.has(statusCode)
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

// order_id sent to PayHere is "BOOK-<group_booking_id>".
export function groupIdFromOrderId(orderId: string): string | null {
  if (!orderId.startsWith("BOOK-")) return null
  const groupId = orderId.slice("BOOK-".length)
  return UUID_RE.test(groupId) ? groupId : null
}

export function orderIdFromGroupId(groupBookingId: string): string {
  return `BOOK-${groupBookingId}`
}

function md5Upper(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex").toUpperCase()
}

export function generateHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string,
): string {
  const amountFormatted = Number(amount).toFixed(2)
  return md5Upper(merchantId + orderId + amountFormatted + currency + md5Upper(merchantSecret))
}

export function verifyNotification(
  merchantId: string,
  orderId: string,
  payhereAmount: string,
  payhereCurrency: string,
  statusCode: string,
  md5sig: string,
  merchantSecret: string,
): boolean {
  if (!merchantSecret || !md5sig) return false

  // PayHere signs `payhere_amount` exactly as it sends it. We normalise to two
  // decimals because that is what our checkout form sends, but also accept the
  // verbatim value in case the gateway ever trims trailing zeros.
  const amounts = new Set([payhereAmount, Number(payhereAmount).toFixed(2)])
  const signature = md5sig.trim().toUpperCase()
  const secretHash = md5Upper(merchantSecret)

  for (const amount of amounts) {
    const expected = md5Upper(merchantId + orderId + amount + payhereCurrency + statusCode + secretHash)
    if (expected === signature) return true
  }

  return false
}
