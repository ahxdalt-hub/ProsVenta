"use client";

// ============================================================================
// GetMoreCreditsCard — Settings › Credits & Usage › Credit packages
// ============================================================================
// Compact top-up cards rendered from the AUTHORITATIVE central catalog
// (GET /api/payments/packages — the same catalog checkout re-resolves).
// No local package constants. The "Popular" highlight comes from the package's
// configured recommendation; "Best value" is derived from the effective
// credits-per-unit value of the live catalog. Checkout reuses the existing
// payment flow — a purchase is never faked as completed.
// ============================================================================

import { motion, useReducedMotion } from "framer-motion";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsCard, SettingsCardHeader } from "@/components/dashboard/settings/SettingsCard";
import type { CreditPackageDto } from "@/features/credits/api-types";
import { formatCredits } from "@/features/credits/ui-config";
import { EASE_OUT } from "@/lib/motion";
import {
  ErrorState,
  packageUnitValue,
  type PackageCheckout,
} from "./shared";

interface GetMoreCreditsCardProps {
  packages: CreditPackageDto[];
  packagesState: {
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
  bestUnitValue: number | null;
  checkout: PackageCheckout;
  /** When balance is low, the card uses a stronger visual priority. */
  prioritize?: boolean;
}

export function GetMoreCreditsCard({
  packages,
  packagesState,
  bestUnitValue,
  checkout,
  prioritize = false,
}: GetMoreCreditsCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.25, ease: EASE_OUT },
          })}
    >
      <SettingsCard className={prioritize ? "ring-1 ring-amber-200" : undefined}>
        <SettingsCardHeader
          title="Get More Credits"
          description="Top up instantly — credits are added as soon as your payment is confirmed."
        />
        {packagesState.loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl bg-slate-50"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : packagesState.error ? (
          <ErrorState
            message={packagesState.error}
            onRetry={() => void packagesState.refresh()}
          />
        ) : packages.length === 0 ? (
          <p className="text-sm text-slate-500">
            No credit packages are available right now.
          </p>
        ) : (
          <PackageGrid
            packages={packages}
            bestUnitValue={bestUnitValue}
            checkout={checkout}
          />
        )}
      </SettingsCard>
    </motion.section>
  );
}

function PackageGrid({
  packages,
  bestUnitValue,
  checkout,
}: {
  packages: CreditPackageDto[];
  bestUnitValue: number | null;
  checkout: PackageCheckout;
}) {
  const reduce = useReducedMotion();
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg) => {
          const unit = packageUnitValue(pkg);
          const isBest = bestUnitValue !== null && unit === bestUnitValue;
          const starting = checkout.startingKey === pkg.key;
          return (
            <motion.article
              key={pkg.key}
              className={`flex flex-col rounded-xl border p-4 transition-colors duration-150 ${
                pkg.recommended
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              {...(reduce
                ? {}
                : {
                    whileHover: { y: -2 },
                    transition: { duration: 0.15, ease: EASE_OUT },
                  })}
              data-testid="credit-package-card"
              data-recommended={pkg.recommended || undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sky-600">
                    <CreditToken size={20} />
                  </span>
                  <span className="text-base font-bold tracking-tight text-slate-900 tabular-nums">
                    {formatCredits(pkg.creditAmount)}
                  </span>
                  <span className="text-xs text-slate-500">credits</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {pkg.discountPercent !== null && (
                    <Badge variant="success">{pkg.discountPercent}% OFF</Badge>
                  )}
                  {pkg.recommended && <Badge>Popular</Badge>}
                  {!pkg.recommended && isBest && (
                    <Badge>Best value</Badge>
                  )}
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {pkg.displayPrice}
              </p>
              {unit !== null && (
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  ≈ {formatCredits(Math.round(unit))} credits per{" "}
                  {pkg.displayPrice.replace(/[\d.,\s]/g, "") || pkg.currency}
                </p>
              )}
              <Button
                className="mt-3.5"
                size="sm"
                loading={starting}
                disabled={checkout.startingKey !== null && !starting}
                onClick={() => void checkout.start(pkg)}
                aria-label={`Purchase ${formatCredits(pkg.creditAmount)} credits for ${pkg.displayPrice}`}
              >
                {starting ? "Preparing checkout…" : "Purchase"}
              </Button>
            </motion.article>
          );
        })}
      </div>
      {checkout.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
        >
          {checkout.error}
        </p>
      )}
    </>
  );
}
