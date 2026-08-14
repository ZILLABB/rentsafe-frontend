import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display font-600 transition-all duration-150 focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-700",
        gradient: "gradient-brand text-white shadow-lift hover:shadow-pop",
        secondary: "bg-muted text-foreground hover:bg-accent",
        outline:
          "border border-border bg-card text-foreground shadow-soft hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        success: "bg-success text-success-foreground shadow-soft hover:opacity-90",
        danger: "bg-danger text-danger-foreground shadow-soft hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3.5 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
