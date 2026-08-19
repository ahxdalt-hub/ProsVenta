import Link from "next/link";
import { BrandLogo } from "@/components/branding/BrandLogo";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      <Link href="/" className="inline-flex items-center gap-2 mb-6">
        <BrandLogo size="sm" iconSize={18} />
        <span className="text-lg font-semibold text-slate-900">Prosventa</span>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}