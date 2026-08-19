interface SuccessAlertProps {
  message?: string | null;
}

export default function SuccessAlert({ message }: SuccessAlertProps) {
  if (!message) return null;

  return (
    <div
      className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 animate-fade-in"
      role="status"
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}