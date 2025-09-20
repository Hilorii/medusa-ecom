import { NextResponse } from "next/server"
import { getCacheTag, sharedCookieSecurity } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  // Clear any lingering cart cookies so new sessions start fresh.
  res.cookies.set({
    name: "cart_id",
    value: "",
    path: "/",
    maxAge: -1,
  })

  res.cookies.set("_medusa_cart_id", "", {
    httpOnly: true,
    ...sharedCookieSecurity,
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
