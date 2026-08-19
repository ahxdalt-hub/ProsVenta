import { BrandLogo } from "@/components/branding/BrandLogo";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex items-center gap-2 mb-8">
          <BrandLogo size="sm" iconSize={18} />
          <span className="text-lg font-semibold text-slate-900">Prosventa</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: August 2025</p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Agreement to Terms</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              By accessing or using Prosventa, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Use of the Service</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>• You must be at least 18 years old to use Prosventa</p>
              <p>• You are responsible for maintaining the confidentiality of your account credentials</p>
              <p>• You agree not to misuse the service or attempt to access it in unauthorized ways</p>
              <p>• You are responsible for the content you add to the platform</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Subscriptions and Billing</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Paid plans are billed on a recurring basis. You can upgrade, downgrade, or cancel your subscription at any time. Cancellations take effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Intellectual Property</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              All content, features, and functionality of Prosventa are owned by us and protected by intellectual property laws. You retain ownership of the data you input into the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Limitation of Liability</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              To the maximum extent permitted by law, Prosventa shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Termination</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              We may terminate or suspend your access to the service for violations of these terms. You may also terminate your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Contact Us</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              If you have questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:legal@prosventa.com" className="text-blue-600 hover:underline">
                legal@prosventa.com
              </a>
              .
            </p>
          </section>
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