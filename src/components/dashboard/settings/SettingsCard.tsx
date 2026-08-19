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
 * Premium typography with clear hierarchy.
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
  children: React.ReactNode;
  className?: string;
}

/**
 * A settings row with title/description on the left and action on the right.
 * Improved typography with better contrast and line spacing.
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
 * "Coming Soon" badge for future-ready features.
 * Clean, enterprise-grade pill with proper contrast.
 */
export function ComingSoonBadge() {
  return (
    <span className="settings-badge-soon">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Coming Soon
    </span>
  );
}