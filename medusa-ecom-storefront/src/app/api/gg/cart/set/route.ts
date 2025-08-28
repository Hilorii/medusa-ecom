// Server endpoint to set the cart cookie from client.
// All comments in English (as requested).

import { NextResponse } from "next/server"
import { setCartId } from "@lib/data/cookies" // już masz ten util

export async function POST(req: Request) {
  try {
    const { cart_id } = await req.json()
    if (!cart_id) {
      return NextResponse.json(
        { error: "cart_id is required" },
        { status: 400 }
      )
    }
    await setCartId(cart_id) // zapisze cookie zgodnie z Twoją logiką
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to set cart cookie" },
      { status: 500 }
    )
  }
}
