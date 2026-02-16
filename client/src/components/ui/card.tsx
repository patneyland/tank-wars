import * as React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/10 bg-black/50 backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.35)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
