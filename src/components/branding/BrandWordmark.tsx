import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

interface BrandWordmarkProps {
  className?: string;
  logoSize?: "sm" | "md" | "lg" | "xl";
  textClassName?: string;
  text?: string;
}

export function BrandWordmark({ className, logoSize = "sm", textClassName, text = "Prosventa" }: BrandWordmarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandLogo size={logoSize} />
      <span className={cn("font-semibold tracking-tight", textClassName)}>{text}</span>
    </div>
  );
}