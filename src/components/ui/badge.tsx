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
          "bg-white/5 text-ledger-text-secondary border border-border",
        secondary:
          "bg-secondary text-ledger-text border border-border",
        gold:
          "bg-gold/10 text-gold border border-gold/20",
        green:
          "bg-statement-green/10 text-statement-green border border-statement-green/20",
        red:
          "bg-audit-red/10 text-audit-red border border-audit-red/15",
        blue:
          "bg-inquiry-blue/10 text-inquiry-blue border border-inquiry-blue/20",
        teal:
          "bg-statement-teal/10 text-statement-teal border border-statement-teal/20",
        amber:
          "bg-warning-amber/10 text-warning-amber border border-warning-amber/20",
        purple:
          "bg-authority-purple/10 text-authority-purple border border-authority-purple/20",
        outline:
          "bg-transparent text-ledger-text-secondary border border-border",
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
