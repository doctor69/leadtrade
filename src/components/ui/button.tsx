import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 border-0 outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "text-white shadow-sm active:scale-[0.98]",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.85)] active:scale-[0.98] shadow-sm",
        outline:
          "border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--primary)/0.08)] dark:hover:bg-[hsl(var(--primary)/0.15)] active:scale-[0.98] active:bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)] active:scale-[0.98] shadow-sm",
        ghost:
          "bg-transparent hover:bg-[hsl(var(--primary)/0.08)] dark:hover:bg-[hsl(var(--primary)/0.15)] active:scale-[0.98] active:bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--foreground))]",
        link:
          "text-[hsl(var(--primary))] underline-offset-4 hover:underline bg-transparent",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success)/0.85)] active:scale-[0.98] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-lg px-3 text-xs min-h-[36px]",
        lg: "h-12 rounded-xl px-8 min-h-[48px] text-base",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const gradientStyle = (!variant || variant === "default") ? {
      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 60%))',
      boxShadow: '0 2px 10px hsl(var(--primary) / 0.35)',
      ...style,
    } : style;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={gradientStyle}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
