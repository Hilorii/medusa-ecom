import { NextResponse } from "next/server"
import { getCacheTag } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"

export async function POST(req: Request) {
  try {
    const { cart_id } = await req.json()

    if (!cart_id) {
      return NextResponse.json(
        { error: "cart_id is required" },
        { status: 400 }
      )
    }

    const res = NextResponse.json({ ok: true, cart_id })

    // Remove previously set wrong cookie name (if any)
    res.cookies.set({
      name: "cart_id",
      value: "",
      path: "/",
      maxAge: -1,
    })

    // Set the cookie name expected by server actions: "_medusa_cart_id"
    res.cookies.set("_medusa_cart_id", cart_id, {
      httpOnly: true,
      sameSite: "strict", // match your server util
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days (match setCartId in cookies.ts)
      path: "/",
    })

    return res
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to set cart cookie" },
      { status: 500 }
    )
  }
}
