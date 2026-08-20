import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-slate-800/80 text-slate-100 border border-slate-700/80 hover:bg-slate-700/80 hover:border-slate-600 shadow-sm hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800/60 hover:text-white",
        ghost:
          "text-slate-300 hover:bg-slate-800/50 hover:text-white",
        gov:
          "bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/30",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
