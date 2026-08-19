import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { APP_NAME } from "@/constants";

export function AboutSection() {
  const version = "0.1.0";
  const buildVersion = "2025.08.03";
  const environment =
    process.env.NODE_ENV === "production" ? "Production" : "Development";

  return (
    <div className="space-y-6">
      {/* App identity */}
      <SettingsCard>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-800 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
            P
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{APP_NAME}</h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Modern prospect discovery for growing businesses.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>
      </SettingsCard>

      {/* Version info */}
      <SettingsCard>
        <SettingsCardHeader
          title="Version Information"
          description="Application and build details"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
        />
        <div className="space-y-3">
          <InfoRow label="Prosventa Version" value={`v${version}`} />
          <InfoRow label="Build Version" value={buildVersion} />
          <InfoRow label="Environment" value={environment} />
        </div>
      </SettingsCard>

      {/* Legal */}
      <SettingsCard>
        <SettingsCardHeader
          title="Legal"
          description="Policies and agreements"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          }
        />
        <div className="space-y-1">
          <LegalLink href="/privacy" label="Privacy Policy" />
          <LegalLink href="/terms" label="Terms of Service" />
          <LegalLink href="/security" label="Security" />
        </div>
      </SettingsCard>

      {/* Credits */}
      <div className="text-center py-4">
        <p className="text-[13px] text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <p className="text-[13px] text-slate-400 mt-1">
          Built with Next.js, Supabase, and Tailwind CSS.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between gap-4 py-2.5 px-3 -mx-3 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <svg
        className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </a>
  );
}