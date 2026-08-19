import { cn } from "@/lib/utils";
import { BrandIcon } from "./BrandIcon";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  iconSize?: number;
  strokeWidth?: number;
  shadow?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
  lg: "h-14 w-14 rounded-2xl",
  xl: "h-16 w-16 rounded-2xl",
};

const defaultIconSizes = { sm: 14, md: 20, lg: 24, xl: 28 };

export function BrandLogo({ className, size = "sm", iconSize, strokeWidth = 2, shadow = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center justify-center bg-navy-900", sizeClasses[size], shadow && "shadow-sm", className)}>
      <BrandIcon size={iconSize ?? defaultIconSizes[size]} strokeWidth={strokeWidth} />
    </div>
  );
}