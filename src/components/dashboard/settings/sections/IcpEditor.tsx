"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveWorkspaceIcpAction,
  resetWorkspaceIcpAction,
} from "@/features/intelligence/scoring/icp-actions";
import {
  createEmptyIcpCriteria,
  type IcpCriteria,
} from "@/features/intelligence/scoring/types";
import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { EASE_OUT } from "@/lib/motion";

// ============================================================================
// IcpEditor - interactive editing layer for the workspace ICP
// ============================================================================
// Writes go through the preserved saveWorkspaceIcpAction (org-scoped,
// server-validated). Saving updates the same configuration the scoring engine
// reads - no scoring logic is touched here.
// ============================================================================

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"];

interface IcpEditorProps {
  initialName: string | null;
  initialDescription: string | null;
  initialCriteria: IcpCriteria | null;
  /** Reports true while there are unsaved local edits (panel close guard). */
  onDirtyChange?: (dirty: boolean) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function IcpEditor({ initialName, initialDescription, initialCriteria, onDirtyChange }: IcpEditorProps) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<IcpCriteria>(initialCriteria ?? createEmptyIcpCriteria());
  const [name, setName] = useState(initialName ?? "Default ICP");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Snapshot of the values this editor was mounted with — the baseline the
  // unsaved-changes detection compares against (never fabricated).
  const initialSnapshot = {
    name: initialName ?? "Default ICP",
    description: initialDescription ?? "",
    criteria: initialCriteria ?? createEmptyIcpCriteria(),
  };
  const isDirty =
    name !== initialSnapshot.name ||
    description !== initialSnapshot.description ||
    JSON.stringify(criteria) !== JSON.stringify(initialSnapshot.criteria);

  // Report genuine unsaved edits upward so the detail panel can guard close.
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  function toggleSize(size: string) {
    setCriteria((c) => ({
      ...c,
      company: {
        ...c.company,
        targetCompanySizes: c.company.targetCompanySizes.includes(size)
          ? c.company.targetCompanySizes.filter((s) => s !== size)
          : [...c.company.targetCompanySizes, size],
      },
    }));
  }

  async function handleSave() {
    setError(null);
    setSaveState("saving");
    try {
      const result = await saveWorkspaceIcpAction({
        name,
        description: description.trim() || null,
        criteria,
      });
      if (result.error || !result.config) {
        setSaveState("error");
        setError(result.error || "Your Ideal Customer Profile couldn't be saved.");
        return;
      }
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setError("Your Ideal Customer Profile couldn't be saved. Please try again.");
    }
  }

  async function handleReset() {
    setError(null);
    setSaveState("saving");
    try {
      const result = await resetWorkspaceIcpAction();
      if (result.error) {
        setSaveState("error");
        setError(result.error);
        return;
      }
      setCriteria(createEmptyIcpCriteria());
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setError("The profile couldn't be cleared. Please try again.");
    }
  }

  return (
    <SettingsCard>
      <SettingsCardHeader
        title="Configure criteria"
        description="Only the basics that actually drive prospect scoring - nothing speculative."
      />

      <div className="space-y-7">
        {/* Company */}
        <fieldset>
          <legend className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Company
          </legend>
          <div className="space-y-5">
            <TagField
              id="icp-industries"
              label="Target industries"
              hint="Exact industry names, e.g. SaaS, Fintech, Healthcare."
              values={criteria.company.targetIndustries}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, company: { ...c.company, targetIndustries: values } }))
              }
            />
            <TagField
              id="icp-excluded"
              label="Excluded industries"
              hint="Industries Prosventa should deprioritize."
              values={criteria.company.excludedIndustries}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, company: { ...c.company, excludedIndustries: values } }))
              }
            />
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">Company size</span>
              <div className="flex flex-wrap gap-2">
                {COMPANY_SIZES.map((size) => {
                  const active = criteria.company.targetCompanySizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSize(size)}
                      className={
                        active
                          ? "rounded-full bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors"
                          : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TagField
                id="icp-countries"
                label="Target countries"
                hint="e.g. United States, Germany."
                values={criteria.company.targetCountries}
                onChange={(values) =>
                  setCriteria((c) => ({ ...c, company: { ...c.company, targetCountries: values } }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="icp-min-employees"
                  label="Min employees"
                  value={criteria.company.minEmployees}
                  onChange={(v) =>
                    setCriteria((c) => ({ ...c, company: { ...c.company, minEmployees: v } }))
                  }
                />
                <NumberField
                  id="icp-max-employees"
                  label="Max employees"
                  value={criteria.company.maxEmployees}
                  onChange={(v) =>
                    setCriteria((c) => ({ ...c, company: { ...c.company, maxEmployees: v } }))
                  }
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* People */}
        <fieldset>
          <legend className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            People
          </legend>
          <div className="space-y-5">
            <TagField
              id="icp-titles"
              label="Job titles"
              hint="Substring match, e.g. VP Sales, Head of Marketing."
              values={criteria.prospect.targetJobTitles}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, prospect: { ...c.prospect, targetJobTitles: values } }))
              }
            />
            <TagField
              id="icp-departments"
              label="Departments"
              hint="e.g. Sales, Marketing, Engineering."
              values={criteria.prospect.targetDepartments}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, prospect: { ...c.prospect, targetDepartments: values } }))
              }
            />
            <TagField
              id="icp-seniority"
              label="Seniority levels"
              hint="e.g. C-level, VP, Director, Manager."
              values={criteria.prospect.targetSeniorityLevels}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, prospect: { ...c.prospect, targetSeniorityLevels: values } }))
              }
            />
            <TagField
              id="icp-excluded-roles"
              label="Excluded roles"
              hint="Roles that should never score well, e.g. Intern, Student."
              values={criteria.prospect.excludedRoles}
              onChange={(values) =>
                setCriteria((c) => ({ ...c, prospect: { ...c.prospect, excludedRoles: values } }))
              }
            />
          </div>
        </fieldset>

        {/* Label / notes + actions */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="icp-name" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Profile name
            </label>
            <input
              id="icp-name"
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label htmlFor="icp-description" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Notes (optional)
            </label>
            <input
              id="icp-description"
              type="text"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this profile fits your business"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={saveState === "saving"}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            Clear all criteria
          </button>
          <AnimatePresence>
            {(saveState === "saving" || saveState === "saved") && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className="text-[13px] font-medium"
              >
                {saveState === "saving" ? (
                  <span className="text-slate-500">Saving…</span>
                ) : (
                  <span className="text-emerald-600">Saved - scoring updated</span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {saveState === "saving" ? (
              <>
                <SpinnerIcon />
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <CheckIcon />
                Saved
              </>
            ) : (
              "Save Ideal Customer Profile"
            )}
          </button>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              role="alert"
              className="text-[13px] font-medium text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </SettingsCard>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ------------------------------ Sub-fields -------------------------------- */

function TagField({
  id,
  label,
  hint,
  values,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (!values.some((existing) => existing.toLowerCase() === v.toLowerCase())) {
      onChange([...values, v]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 text-[13px] font-medium text-slate-700"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder={values.length === 0 ? "Type and press Enter" : ""}
        />
      </div>
      {hint && <p className="mt-1 text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0));
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}
