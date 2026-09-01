import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { SettingsPageHeaderMotion } from "./SettingsPageHeaderMotion";
import { SettingsSaveStateMotion } from "./SettingsSaveStateMotion";

// ============================================================================
// SettingsPageHeader
// ============================================================================

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Page-level header for a Settings page: h1 title, description, optional actions.
 * Server Component wrapper — the entrance animation lives in the dedicated
 * Client Component (SettingsPageHeaderMotion) so framer-motion never runs on
 * the server.
 */
export function SettingsPageHeader({ title, description, actions }: SettingsPageHeaderProps) {
  return (
    <SettingsPageHeaderMotion title={title} description={description} actions={actions} />
  );
}

// ============================================================================
// SettingsSection — labelled content section within a page
// ============================================================================

interface SettingsSectionProps {
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ children, className = "" }: SettingsSectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      {children}
    </section>
  );
}

// ============================================================================
// Save state / feedback
// ============================================================================

type SaveStateKind = "idle" | "saving" | "saved" | "error";

interface SettingsSaveStateProps {
  state: SaveStateKind;
  message?: string;
}

/**
 * Inline save-state indicator for form sections.
 * Pairs with the existing toast system for transient feedback.
 * Server-safe wrapper — animation lives in the dedicated Client Component
 * (SettingsSaveStateMotion) so framer-motion never runs on the server.
 */
export function SettingsSaveState({ state, message }: SettingsSaveStateProps) {
  if (state === "idle") return null;

  const label =
    message ??
    (state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Changes saved"
        : "Something went wrong");

  return <SettingsSaveStateMotion state={state} label={label} />;
}

// ============================================================================
// Error state
// ============================================================================

interface SettingsErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Inline error block with optional retry action. */
export function SettingsErrorState({ message, onRetry }: SettingsErrorStateProps) {
  return (
    <Alert
      variant="error"
      title="Something went wrong"
      onRetry={onRetry}
      retryLabel="Try again"
    >
      {message}
    </Alert>
  );
}

// ============================================================================
// Empty state — reuses the shared EmptyState primitive
// ============================================================================

interface SettingsEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function SettingsEmptyState({ title, description, icon }: SettingsEmptyStateProps) {
  return <EmptyState title={title} description={description} icon={icon} />;
}
