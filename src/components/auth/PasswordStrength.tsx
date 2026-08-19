"use client";

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Very strong", color: "bg-emerald-500" };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = getStrength(password);
  const segments = 5;

  return (
    <div className="space-y-1.5" aria-label={`Password strength: ${strength.label}`}>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < strength.score ? strength.color : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Password strength: <span className="font-medium text-slate-700">{strength.label}</span>
      </p>
    </div>
  );
}