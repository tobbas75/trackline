import { cn } from "./cn";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "ochre" | "eucalypt" | "sky";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "text-stone-400 border-stone-200",
  primary: "text-red-dust border-red-dust/30 bg-red-dust/5",
  ochre: "text-ochre border-ochre/30 bg-ochre/5",
  eucalypt: "text-eucalypt border-eucalypt/30 bg-eucalypt/5",
  sky: "text-sky border-sky/30 bg-sky/5",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-semibold tracking-widest uppercase border rounded-full px-3 py-1",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
