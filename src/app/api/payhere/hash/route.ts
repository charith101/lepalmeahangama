import { NextRequest, NextResponse } from "next/server"
import { generateHash } from "@/lib/payhere"

export async function POST(request: NextRequest) {
  try {
    const { order_id, amount, currency } = await request.json()

    if (!order_id || !amount || !currency) {
      return NextResponse.json({ error: "Missing required fields: order_id, amount, currency" }, { status: 400 })
    }

    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID || ""
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || ""

    const hash = generateHash(merchantId, order_id, String(amountNum), currency, merchantSecret)

    return NextResponse.json({ hash, merchant_id: merchantId })
  } catch {
    return NextResponse.json({ error: "Failed to generate hash" }, { status: 500 })
  }
}
