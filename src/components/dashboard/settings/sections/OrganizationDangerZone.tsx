"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganizationAction } from "@/features/organization/actions/organization";

// ============================================================================
// OrganizationDangerZone — Settings › Organization
// ============================================================================
// Real destructive capability (deleteOrganizationAction exists and is enforced
// owner-only server-side). Rendered ONLY for the owner, visually separated,
// with a deliberate typed confirmation that spells out the consequence.
// ============================================================================

interface OrganizationDangerZoneProps {
  organizationName: string;
}

export function OrganizationDangerZone({ organizationName }: OrganizationDangerZoneProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmationMatches =
    confirmation.trim().toLowerCase() === organizationName.trim().toLowerCase();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganizationAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
      <h3 className="text-[15px] font-semibold text-red-900 tracking-tight">Danger zone</h3>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-red-700/90">
        Deleting this workspace permanently removes it for everyone — prospects,
        lists, intelligence data and member access cannot be recovered.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setConfirmation("");
            setError(null);
            setOpen(true);
          }}
          className="mt-4 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Delete workspace
        </button>
      ) : (
        <div className="mt-4 max-w-md rounded-lg border border-red-200 bg-white p-4">
          <label htmlFor="delete-confirmation" className="block text-sm font-medium text-slate-800">
            Type <span className="font-semibold text-red-600">{organizationName}</span> to confirm
          </label>
          <input
            id="delete-confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            disabled={pending}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-60"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending || !confirmationMatches}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}