// Thin wrapper around the PayHere Refund API.
//
// Live and sandbox are separate environments with separate credentials, so the
// base URL follows NEXT_PUBLIC_PAYHERE_MODE exactly like the checkout form.
const API_BASE =
  process.env.NEXT_PUBLIC_PAYHERE_MODE === "live"
    ? "https://www.payhere.lk"
    : "https://sandbox.payhere.lk"

async function getAccessToken(): Promise<string> {
  const appId = process.env.PAYHERE_APP_ID ?? ""
  const appSecret = process.env.PAYHERE_APP_SECRET ?? ""
  if (!appId || !appSecret) {
    throw new Error("PayHere API keys are not configured - refund this payment in the PayHere portal instead")
  }
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64")

  const res = await fetch(`${API_BASE}/merchant/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`PayHere OAuth failed: ${res.status}`)
  const data = (await res.json()) as { access_token?: unknown }
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("PayHere OAuth response carried no token")
  }
  return data.access_token
}

export async function refundPayherePayment(
  paymentId: string,
  description: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAccessToken()

    const res = await fetch(`${API_BASE}/merchant/v1/payment/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payment_id: paymentId, description }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })

    const data = (await res.json()) as { status?: unknown; msg?: unknown }
    if (Number(data.status) === 1) return { success: true }
    return {
      success: false,
      error: typeof data.msg === "string" ? data.msg : `Refund rejected with HTTP ${res.status}`,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Refund request failed" }
  }
}
