"use client";

interface RememberMeProps {
  defaultChecked?: boolean;
}

export default function RememberMe({ defaultChecked }: RememberMeProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          name="remember"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-navy-900 peer-checked:border-navy-900 transition-all duration-150 group-hover:border-slate-400 peer-focus:ring-2 peer-focus:ring-navy-900/20" />
        <svg
          className="absolute inset-0 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-sm text-slate-600 select-none">Remember me</span>
    </label>
  );
}