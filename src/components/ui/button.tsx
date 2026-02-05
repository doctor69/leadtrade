import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-colors duration-200 border-0 outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)] active:bg-[hsl(var(--primary))] shadow-sm",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.8)] active:bg-[hsl(var(--destructive))] shadow-sm",
        outline:
          "bg-transparent hover:bg-[hsl(var(--primary)/0.1)] dark:hover:!bg-[hsl(var(--primary)/0.5)] active:bg-[hsl(var(--primary)/0.2)] dark:active:!bg-[hsl(var(--primary)/0.6)] text-[hsl(var(--foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)] active:bg-[hsl(var(--secondary))] shadow-sm",
        ghost: 
          "bg-transparent hover:bg-[hsl(var(--primary)/0.1)] dark:hover:!bg-[hsl(var(--primary)/0.5)] active:bg-[hsl(var(--primary)/0.2)] dark:active:!bg-[hsl(var(--primary)/0.6)] text-[hsl(var(--foreground))]",
        link: 
          "text-[hsl(var(--primary))] underline-offset-4 hover:underline bg-transparent",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success)/0.8)] active:bg-[hsl(var(--success))] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
        lg: "h-12 rounded-md px-8 min-h-[48px]",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
