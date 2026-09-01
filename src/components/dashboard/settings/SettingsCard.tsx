import { cn } from "@/lib/utils";

interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Premium settings card wrapper with consistent padding and styling.
 * Uses light opacity hover for a subtle lift, respecting reduced motion.
 */
export function SettingsCard({ children, className = "" }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "premium-card p-6 sm:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SettingsCardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Settings card header with icon, title, description, and optional action.
 */
export function SettingsCardHeader({
  title,
  description,
  icon,
  action,
  className = "",
}: SettingsCardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-4",
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 text-blue-600 ring-1 ring-blue-100/80 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-snug">
            {title}
          </h3>
          {description && (
            <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface SettingsRowProps {
  title: string;
  description?: string;
  /** Optional right-side action/control. Rows may be informational only. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * A settings row with title/description on the left and action on the right.
 */
export function SettingsRow({
  title,
  description,
  children,
  className = "",
}: SettingsRowProps) {
  return (
    <div className={cn("settings-row", className)}>
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-medium text-slate-800 leading-snug">{title}</p>
        {description && (
          <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Subtle horizontal separator between rows or sections within a card.
 */
export function SettingsDivider({ className = "" }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-slate-100 my-4", className)} />;
}
