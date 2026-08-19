import { BrandLogo } from "@/components/branding/BrandLogo";
import Link from "next/link";

const SECURITY_FEATURES = [
  {
    title: "Encryption",
    description: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Authentication",
    description: "Secure authentication with email verification, password reset, and session management.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Access Control",
    description: "Role-based access control ensures team members only see what they should.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Data Isolation",
    description: "Each organization's data is isolated with strict row-level security policies.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
  },
  {
    title: "Monitoring",
    description: "Continuous monitoring and logging to detect and respond to security events.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    title: "Compliance",
    description: "We follow industry best practices and standards for data protection.",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex items-center gap-2 mb-8">
          <BrandLogo size="sm" iconSize={18} />
          <span className="text-lg font-semibold text-slate-900">Prosventa</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Security
        </h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-2xl">
          Security is foundational to everything we build at Prosventa. We take a defense-in-depth approach to protect your data.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SECURITY_FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  {feature.icon}
                </div>
                <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
              </div>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Report a Vulnerability</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            If you discover a security vulnerability, please report it to us at{" "}
            <a href="mailto:security@prosventa.com" className="text-blue-600 hover:underline">
              security@prosventa.com
            </a>
            . We take all reports seriously and will respond promptly.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}