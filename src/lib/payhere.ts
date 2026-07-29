import crypto from "crypto"

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
  const amountFormatted = Number(payhereAmount).toFixed(2)
  const expected = md5Upper(merchantId + orderId + amountFormatted + payhereCurrency + statusCode + md5Upper(merchantSecret))
  return expected === md5sig
}
