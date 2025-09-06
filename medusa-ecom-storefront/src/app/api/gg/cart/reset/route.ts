import { NextResponse } from "next/server"
import { getCacheTag } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"

export async function POST() {
  const res = NextResponse.json({ ok: true })

  res.cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
    path: "/",
  })

  try {
    const tag = await getCacheTag("carts")
    if (tag) revalidateTag(tag)
  } catch {
    /* ignore revalidate errors */
  }

  return res
}
