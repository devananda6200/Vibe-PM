import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2 py-0.5 text-xs font-bold uppercase transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-foreground bg-primary text-primary-foreground shadow-soft",
        secondary:
          "border-foreground bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        p1: "border-foreground bg-foreground text-card",
        p2: "border-foreground bg-primary text-primary-foreground",
        p3: "border-foreground bg-card text-foreground",
        p4: "border-foreground bg-secondary text-muted-foreground",
        destructive: "border-foreground bg-destructive text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
