import { NextResponse } from "next/server"
import { requireAnyStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const auth = await requireAnyStaff()
  if ("error" in auth) {
    return NextResponse.json({ results: [] }, { status: 401 })
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (!q) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const { data } = await supabase.rpc("global_search", { p_query: q })

  return NextResponse.json({ results: data ?? [] })
}
