interface ErrorAlertProps {
  message?: string | null;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-shake"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}