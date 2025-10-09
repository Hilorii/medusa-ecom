"use client"

import { Button } from "@medusajs/ui"
import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  variant = "primary",
  className,
  "data-testid": dataTestId,
  isPending,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "transparent" | "danger" | null
  className?: string
  "data-testid"?: string
  isPending?: boolean
}) {
  const { pending } = useFormStatus()
  const isLoading = typeof isPending === "boolean" ? isPending : pending

  return (
    <Button
      size="large"
      className={className}
      type="submit"
      isLoading={isLoading}
      variant={variant || "primary"}
      data-testid={dataTestId}
    >
      {children}
    </Button>
  )
}
