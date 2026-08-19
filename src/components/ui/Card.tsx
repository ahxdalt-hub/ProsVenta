import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  as?: "div" | "section" | "article";
  "aria-label"?: string;
}

export function Card({ children, className = "", hover = false, onClick, as: Component = "div", ...rest }: CardProps) {
  return (
    <Component
      onClick={onClick}
      className={cn(
        "premium-card",
        hover && "hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50",
        onClick && "cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, icon, action, className = "" }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-6 pb-0", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-600 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* Premium stat card */
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={cn("premium-card p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-500">
            {icon}
          </div>
          <span className="text-sm text-slate-500">{title}</span>
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
      {trend && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            trend.direction === "up" && "bg-green-50 text-green-700",
            trend.direction === "down" && "bg-red-50 text-red-700",
            trend.direction === "neutral" && "bg-slate-100 text-slate-600"
          )}
        >
          {trend.label}
        </div>
      )}
    </div>
  );
}