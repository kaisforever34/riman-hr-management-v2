import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center text-[13px] font-semibold whitespace-nowrap transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07091A] select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#D4A843] text-[#0D0B07] hover:bg-[#EFC254] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        outline:
          "bg-transparent border text-[#8B93A8] hover:border-[rgba(255,255,255,0.13)] hover:text-[#E0E6F4]",
        secondary:
          "bg-[#131830] text-[#E0E6F4] hover:bg-[#181E38]",
        ghost:
          "bg-transparent text-[#8B93A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E0E6F4]",
        destructive:
          "bg-[rgba(239,68,68,0.1)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.15)]",
        link: "text-[#D4A843] underline-offset-4 hover:underline",
      },
      size: {
        default: "gap-1.5 px-4 py-2 rounded-lg",
        xs: "gap-1 px-2 py-1 rounded-md text-xs",
        sm: "gap-1 px-3 py-1.5 rounded-md text-xs",
        lg: "gap-2 px-6 py-3 rounded-lg text-sm",
        icon: "p-1.5 rounded-md",
        "icon-xs": "p-1 rounded-md",
        "icon-sm": "p-1.5 rounded-md",
        "icon-lg": "p-2 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
