import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#131830] px-3 py-2.5 text-[13.5px] text-[#E0E6F4] transition-colors outline-none placeholder:text-[#4A5168] focus-visible:border-[rgba(212,168,67,0.4)] focus-visible:ring-2 focus-visible:ring-[#D4A843] focus-visible:ring-offset-1 focus-visible:ring-offset-[#07091A] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#EF4444] aria-invalid:ring-3 aria-invalid:ring-[rgba(239,68,68,0.2)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
