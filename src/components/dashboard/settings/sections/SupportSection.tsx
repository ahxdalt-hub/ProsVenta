import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { APP_NAME } from "@/constants";

export function SupportSection() {
  return (
    <div className="space-y-6">
      {/* Help resources */}
      <SettingsCard>
        <SettingsCardHeader
          title="Help & Support"
          description="Get the help you need"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <div className="space-y-1">
          <SupportLink
            href="/dashboard/help"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
            title="Documentation"
            description="Browse guides, tutorials, and best practices"
          />
          <SupportLink
            href="mailto:support@prosventa.com"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
            title="Contact Support"
            description="Email our team at support@prosventa.com"
          />
          <SupportLink
            href="/dashboard/help"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="Community"
            description="Connect with other Prosventa users"
          />
        </div>
      </SettingsCard>

      {/* Status */}
      <SettingsCard>
        <SettingsCardHeader
          title="System Status"
          description="Current service availability"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">All systems operational</p>
            <p className="text-[13px] text-slate-500">No incidents reported</p>
          </div>
        </div>
      </SettingsCard>

      {/* Feedback */}
      <SettingsCard>
        <SettingsCardHeader
          title="Feedback"
          description="Help us improve Prosventa"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          }
        />
        <p className="text-sm text-slate-600 leading-relaxed">
          Have an idea or found a bug? We would love to hear from you. Send your feedback to{" "}
          <a href="mailto:feedback@prosventa.com" className="text-blue-600 font-medium hover:underline">
            feedback@prosventa.com
          </a>
          .
        </p>
      </SettingsCard>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[13px] text-slate-500">
          {APP_NAME} — Premium prospect discovery platform
        </p>
      </div>
    </div>
  );
}

function SupportLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-500 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>
      </div>
      <svg
        className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0"
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