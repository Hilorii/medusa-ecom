import { NextResponse } from "next/server"

const CONTACT_EMAIL = "onboarding@resend.dev"
const RESEND_ENDPOINT = "https://api.resend.com/emails"

type ContactPayload = {
  name?: unknown
  email?: unknown
  message?: unknown
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export async function POST(request: Request) {
  let payload: ContactPayload

  try {
    payload = await request.json()
  } catch (error) {
    console.error("Invalid contact form payload", error)
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    )
  }

  const name = isNonEmptyString(payload.name) ? payload.name.trim() : ""
  const email = isNonEmptyString(payload.email) ? payload.email.trim() : ""
  const message = isNonEmptyString(payload.message)
    ? payload.message.trim()
    : ""

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Please provide your name, email, and message." },
      { status: 400 }
    )
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error("Missing RESEND_API_KEY environment variable.")
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 500 }
    )
  }

  try {
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_EMAIL,
        to: [CONTACT_EMAIL],
        reply_to: email,
        subject: "New contact form message",
        text: `Name: ${name}\nEmail: ${email}\nContent: ${message}`,
      }),
    })

    if (!resendResponse.ok) {
      let errorDetail: unknown = null

      try {
        errorDetail = await resendResponse.json()
      } catch (jsonError) {
        errorDetail = await resendResponse.text()
      }

      console.error("Resend API error", errorDetail)

      return NextResponse.json(
        { error: "Failed to send your message." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send contact email", error)
    return NextResponse.json(
      { error: "Failed to send your message." },
      { status: 500 }
    )
  }
}
