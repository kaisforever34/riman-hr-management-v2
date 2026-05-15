"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-[11.5px] font-semibold tracking-[0.06em] uppercase text-[#4A5168] mb-1.5 select-none",
        className
      )}
      {...props}
    />
  )
}

export { Label }
