import * as React from "react";
import { cn } from "../lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const CrownIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-4 w-4", className)}
    {...props}
  >
    <path d="M3 7l4 3 5-6 5 6 4-3" />
    <path d="M4 7l2 10h12l2-10" />
    <path d="M6 17h12" />
  </svg>
);

export const TrophyIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6", className)}
    {...props}
  >
    <path d="M8 4h8v3a4 4 0 0 1-8 0z" />
    <path d="M6 4h2v3a6 6 0 0 1-2 4" />
    <path d="M18 4h-2v3a6 6 0 0 0 2 4" />
    <path d="M8 20h8" />
    <path d="M10 15h4v5h-4z" />
  </svg>
);

export const SkullIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6", className)}
    {...props}
  >
    <path d="M6 12a6 6 0 1 1 12 0v3a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
    <circle cx="9" cy="11" r="1" />
    <circle cx="15" cy="11" r="1" />
    <path d="M10 16h4" />
  </svg>
);

export const ArrowIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-4 w-4", className)}
    {...props}
  >
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);
