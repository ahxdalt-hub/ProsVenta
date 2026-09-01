"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

// ============================================================================
// SettingsPanelErrorBoundary — contained failure state for Settings panels
// ============================================================================
// Phase 3: if a section component throws while rendering inside the Settings
// detail panel, the user sees a calm, contained explanation here instead of
// being routed to the global error page. The panel (and its Close button)
// stays fully functional; technical details go to the console for
// development only.
// ============================================================================

interface SettingsPanelErrorBoundaryProps {
  /** Changing this remounts the boundary — used by "Try again". */
  resetKey: string;
  children: ReactNode;
}

interface SettingsPanelErrorBoundaryState {
  error: Error | null;
}

export class SettingsPanelErrorBoundary extends Component<
  SettingsPanelErrorBoundaryProps,
  SettingsPanelErrorBoundaryState
> {
  state: SettingsPanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SettingsPanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Technical detail for development — never rendered to the user.
    console.error("[Settings] Section failed to render:", error);
  }

  componentDidUpdate(prevProps: SettingsPanelErrorBoundaryProps) {
    // Switching sections (or pressing Try again) clears the failure state.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center"
        >
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">
            Unable to load this section
          </h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
            Your settings are safe.
            <br />
            Please try again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
