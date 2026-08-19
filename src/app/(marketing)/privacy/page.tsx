import { BrandLogo } from "@/components/branding/BrandLogo";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex items-center gap-2 mb-8">
          <BrandLogo size="sm" iconSize={18} />
          <span className="text-lg font-semibold text-slate-900">Prosventa</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: August 2025</p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {`Prosventa ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.`}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Information We Collect</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
              <p><strong className="text-slate-900">Account Information:</strong> When you create an account, we collect your name, email address, and organization details.</p>
              <p><strong className="text-slate-900">Prospect Data:</strong> We store the prospect information you add, import, or discover through our platform.</p>
              <p><strong className="text-slate-900">Usage Data:</strong> We collect information about how you interact with our platform to improve our services.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. How We Use Your Information</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>• To provide and maintain our services</p>
              <p>• To personalize your experience</p>
              <p>• To send you important updates and notifications</p>
              <p>• To improve our platform and develop new features</p>
              <p>• To ensure the security and integrity of our services</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Data Security</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              We implement industry-standard security measures including encryption in transit and at rest, secure authentication, and regular security audits. Your data is stored in secure data centers with restricted access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Data Sharing</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              We do not sell your personal data. We only share information with service providers who assist us in operating our platform, and only to the extent necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Your Rights</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You can manage your data through your account settings or by contacting our support team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Contact Us</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@prosventa.com" className="text-blue-600 hover:underline">
                privacy@prosventa.com
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