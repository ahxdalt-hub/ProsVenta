"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createProspectAction } from "@/features/prospects/actions/manage";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast";
import { EASE_OUT, DURATION } from "@/lib/motion";

interface CreateProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormState {
  company_name: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  industry: string;
  city: string;
  country: string;
  employee_count: string;
  description: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  company_name: "",
  website: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  industry: "",
  city: "",
  country: "",
  employee_count: "",
  description: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_PATTERN = /^\d+$/;
const MAX_INT32 = 2147483647;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CreateProspectDialog({ open, onOpenChange, onSuccess }: CreateProspectDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isPendingRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  // Lock page scroll while open. A cheap overflow lock with scrollbar-width
  // compensation — no filters, blurs, or transforms are applied to the page,
  // so the Prospects table behind the dialog stays visually stable.
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  // On open: remember the currently focused element. On close: reset transient
  // state and hand focus back to the trigger so keyboard users aren't lost.
  useEffect(() => {
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setError(null);
    setIsSuccess(false);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    const raf = requestAnimationFrame(() => trigger?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Close on Escape (blocked while a submission is in flight).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Cleanup any pending success timer on unmount.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear this field's error as soon as the user edits it — the rest of the
    // form (and every entered value) is left untouched.
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleDismiss() {
    // Never abandon an in-flight submission — wait for the real result.
    if (isPendingRef.current) return;
    onOpenChange(false);
  }

  // Keep Tab focus cycling inside the dialog while it is open.
  function handleTrapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!form.company_name.trim()) {
      errors.company_name = "Company name is required.";
    }
    const email = form.contact_email.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      errors.contact_email = "Enter a valid email address.";
    }
    const employees = form.employee_count.trim();
    if (employees) {
      if (!EMPLOYEE_PATTERN.test(employees)) {
        errors.employee_count = "Enter a whole number.";
      } else if (Number(employees) > MAX_INT32) {
        errors.employee_count = "That number is too large.";
      }
    }
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return false;
    }
    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || isSuccess) return; // guard against double submission
    setError(null);
    if (!validate()) return;

    startTransition(async () => {
      const result = await createProspectAction({
        company_name: form.company_name,
        website: form.website || undefined,
        contact_name: form.contact_name || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        industry: form.industry || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
        employee_count: form.employee_count ? Number(form.employee_count) : undefined,
        description: form.description || undefined,
      });

      if (result.error) {
        // Failure: keep the dialog open and every entered value intact.
        setError(result.error);
        return;
      }

      // Real success: brief confirmation on the button, existing toast, then
      // close smoothly. The table refreshes via the action's revalidatePath.
      setIsSuccess(true);
      toastSuccess(
        "Prospect created",
        `${form.company_name.trim()} was added to your pipeline.`
      );
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        onSuccess();
      }, 500);
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Visual-neutral backdrop: fully transparent. Modal behavior is kept
              (click-outside dismiss) with zero tint, overlay, or blur — the
              dashboard behind the dialog stays visually normal. */}
          <motion.div
            key="create-prospect-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : DURATION.fast, ease: EASE_OUT }}
            onClick={handleDismiss}
            className="fixed inset-0 z-40 bg-transparent"
            aria-hidden="true"
          />

          {/* Centered dialog with guaranteed breathing room from the viewport
              edges on every breakpoint (16px mobile / 24px sm and up). */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.98,
                transition: { duration: reduceMotion ? 0 : DURATION.base, ease: EASE_OUT },
              }}
              transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASE_OUT }}
              onKeyDown={handleTrapFocus}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-prospect-title"
              aria-describedby="create-prospect-description"
              className="pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-w-[720px]"
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-3.5">
                <div>
                  <h2 id="create-prospect-title" className="text-base font-semibold text-slate-900">
                    Add Prospect
                  </h2>
                  <p id="create-prospect-description" className="mt-0.5 text-xs text-slate-400">
                    Manually add a company and its key contact to your pipeline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isPending}
                  aria-label="Close dialog"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Form: scrollable body + pinned footer */}
              <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {/* Basic Information */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Basic information
                    </h3>
                    <div className="mt-2 space-y-3">
                      <Input
                        label="Company Name"
                        name="company_name"
                        value={form.company_name}
                        onChange={(e) => updateField("company_name", e.target.value)}
                        placeholder="e.g. Acme Corporation"
                        error={fieldErrors.company_name}
                        autoFocus
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Contact Name"
                          name="contact_name"
                          value={form.contact_name}
                          onChange={(e) => updateField("contact_name", e.target.value)}
                          placeholder="e.g. Jane Smith"
                          autoComplete="name"
                        />
                        <Input
                          label="Contact Email"
                          name="contact_email"
                          type="email"
                          value={form.contact_email}
                          onChange={(e) => updateField("contact_email", e.target.value)}
                          placeholder="jane@acme.com"
                          autoComplete="email"
                          error={fieldErrors.contact_email}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Contact Phone"
                          name="contact_phone"
                          type="tel"
                          value={form.contact_phone}
                          onChange={(e) => updateField("contact_phone", e.target.value)}
                          placeholder="+1 555 010 0100"
                          autoComplete="tel"
                        />
                        <Input
                          label="Website"
                          name="website"
                          type="url"
                          value={form.website}
                          onChange={(e) => updateField("website", e.target.value)}
                          placeholder="https://acme.com"
                          autoComplete="url"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Additional Information */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Additional information
                    </h3>
                    <div className="mt-2 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Industry"
                          name="industry"
                          value={form.industry}
                          onChange={(e) => updateField("industry", e.target.value)}
                          placeholder="e.g. SaaS"
                        />
                        <Input
                          label="Employees"
                          name="employee_count"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={form.employee_count}
                          onChange={(e) => updateField("employee_count", e.target.value)}
                          placeholder="e.g. 250"
                          error={fieldErrors.employee_count}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="City"
                          name="city"
                          value={form.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          placeholder="e.g. London"
                        />
                        <Input
                          label="Country"
                          name="country"
                          value={form.country}
                          onChange={(e) => updateField("country", e.target.value)}
                          placeholder="e.g. United Kingdom"
                        />
                      </div>
                      <Textarea
                        label="Description"
                        name="description"
                        rows={3}
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Short context about this prospect (optional)"
                      />
                    </div>
                  </section>
                </div>

                {/* Footer — always visible, pinned below the scrolling body */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
                  {error && (
                    <div
                      role="alert"
                      className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
                    >
                      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDismiss}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" loading={isPending} isSuccess={isSuccess}>
                      Create Prospect
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}