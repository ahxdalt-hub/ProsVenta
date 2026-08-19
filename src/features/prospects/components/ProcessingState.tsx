// ============================================================================
// Prosventa Discovery Processing State
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Shown when a discovery search request is pending or being processed.
// ============================================================================

interface ProcessingStateProps {
  title?: string;
  description?: string;
}

export function ProcessingState({
  title = "Processing your search",
  description = "Your discovery request is being prepared. Once processing begins, results will appear in your prospects workspace.",
}: ProcessingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
        {/* Spinning ring */}
        <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <path d="M32 4a28 28 0 0128 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* Center icon */}
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 11-9-9" />
          <path d="M21 3v6h-6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 text-center mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-md">
        {description}
      </p>
    </div>
  );
}