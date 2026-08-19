import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
      <div className="text-center max-w-md animate-fade-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 shadow-xl shadow-navy-900/20">
          <Compass className="h-7 w-7 text-white" aria-hidden="true" />
        </div>
        <p className="mt-6 text-6xl font-bold text-navy-900 tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          {"The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-press inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition-all duration-150 hover:shadow-md"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Home
          </Link>
          <Link
            href="/login"
            className="btn-press inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all duration-150"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}