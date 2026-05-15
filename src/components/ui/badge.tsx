import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(255,255,255,0.05)] text-[#8B93A8] border border-[rgba(255,255,255,0.065)]",
        secondary:
          "bg-[#131830] text-[#E0E6F4] border border-[rgba(255,255,255,0.065)]",
        gold:
          "bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]",
        green:
          "bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]",
        red:
          "bg-[rgba(239,68,68,0.08)] text-[#EF4444] border border-[rgba(239,68,68,0.15)]",
        blue:
          "bg-[rgba(75,139,240,0.1)] text-[#4B8BF0] border border-[rgba(75,139,240,0.2)]",
        teal:
          "bg-[rgba(15,200,186,0.1)] text-[#0FC8BA] border border-[rgba(15,200,186,0.2)]",
        amber:
          "bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]",
        purple:
          "bg-[rgba(139,92,246,0.1)] text-[#8B5CF6] border border-[rgba(139,92,246,0.2)]",
        outline:
          "bg-transparent text-[#8B93A8] border border-[rgba(255,255,255,0.065)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
