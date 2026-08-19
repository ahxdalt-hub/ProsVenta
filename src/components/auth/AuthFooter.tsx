import Link from "next/link";

interface AuthFooterProps {
  text: string;
  linkText: string;
  linkHref: string;
}

export default function AuthFooter({ text, linkText, linkHref }: AuthFooterProps) {
  return (
    <p className="mt-6 text-center text-sm text-slate-500">
      {text}{" "}
      <Link href={linkHref} className="text-blue-600 hover:text-blue-500 font-medium transition-colors duration-150">
        {linkText}
      </Link>
    </p>
  );
}