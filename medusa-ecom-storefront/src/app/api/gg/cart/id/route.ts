import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const store = await cookies()
    const cookieValue =
      store.get("_medusa_cart_id")?.value ?? store.get("cart_id")?.value

    return NextResponse.json({ cart_id: cookieValue ?? null })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to read cart cookie" },
      { status: 500 }
    )
  }
}
