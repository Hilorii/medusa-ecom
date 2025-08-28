import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { cart_id } = await req.json()

    if (!cart_id) {
      return NextResponse.json(
        { error: "cart_id is required" },
        { status: 400 }
      )
    }

    // tworzysz odpowiedź i ustawiasz cookie na niej
    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: "cart_id",
      value: cart_id,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dni
    })

    return res
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to set cart cookie" },
      { status: 500 }
    )
  }
}
