// ponytail: thin wrapper around PayHere Refund API (sandbox)
const TOKEN_URL = "https://sandbox.payhere.lk/merchant/v1/oauth/token"
const REFUND_URL = "https://sandbox.payhere.lk/merchant/v1/payment/refund"

async function getAccessToken(): Promise<string> {
  const appId = process.env.PAYHERE_APP_ID ?? ""
  const appSecret = process.env.PAYHERE_APP_SECRET ?? ""
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64")

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) throw new Error(`PayHere OAuth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function refundPayherePayment(
  paymentId: string,
  description: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAccessToken()

    const res = await fetch(REFUND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payment_id: paymentId, description }),
    })

    const data = await res.json()
    if (data.status === 1) return { success: true }
    return { success: false, error: data.msg ?? "Refund failed" }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Refund request failed" }
  }
}
