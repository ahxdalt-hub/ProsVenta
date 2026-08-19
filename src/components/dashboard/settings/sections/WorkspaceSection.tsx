"use client";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast";
import { updateOrganizationAction } from "@/features/organization/actions/organization";
import type { Organization } from "@/types/database";

interface WorkspaceSectionProps {
  organization: Organization | null;
  isOwner: boolean;
}

const INDUSTRY_OPTIONS = [
  { value: "software", label: "Software" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
];

export function WorkspaceSection({
  organization,
  isOwner,
}: WorkspaceSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const [form, setForm] = useState({
    name: organization?.name || "",
    website: organization?.website || "",
    industry: organization?.industry || "",
    country: organization?.country || "",
    description: organization?.description || "",
  });

  function handleCancel() {
    setForm({
      name: organization?.name || "",
      website: organization?.website || "",
      industry: organization?.industry || "",
      country: organization?.country || "",
      description: organization?.description || "",
    });
    setError(null);
    setIsEditing(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizationAction({
        name: form.name,
        website: form.website || undefined,
        industry: form.industry || undefined,
        country: form.country || undefined,
        description: form.description || undefined,
      });
      if (result.error) {
        setError(result.error);
        toastError("Failed to update workspace", result.error);
        return;
      }
      toastSuccess("Workspace updated", "Your organization details have been saved.");
      setIsEditing(false);
    });
  }

  if (!organization) {
    return (
      <SettingsCard>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900">No workspace found</p>
          <p className="mt-1 text-[13px] text-slate-500">Please contact support if this issue persists.</p>
        </div>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo + workspace header */}
      <SettingsCard>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="shrink-0">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-20 h-20 rounded-xl object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-navy-700 to-blue-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-slate-200">
                {organization.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              {organization.name}
            </h2>
            {organization.website && (
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-0.5 inline-block"
              >
                {organization.website}
              </a>
            )}
            {organization.description && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {organization.description}
              </p>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Edit workspace */}
      <SettingsCard>
        <SettingsCardHeader
          title="Workspace Details"
          description="Update your organization information"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4" />
            </svg>
          }
          action={
            isOwner && !isEditing ? (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Button>
            ) : null
          }
        />
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <Input
                label="Company Name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Acme Corporation"
                required
              />
              <Input
                label="Website"
                name="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Industry"
                  name="industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Country"
                  name="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. United States"
                />
              </div>
              <Textarea
                label="Description"
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of your organization"
                rows={3}
              />
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={isPending} disabled={!form.name.trim()}>
                  Save Changes
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Company Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{organization.name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Website</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {organization.website ? (
                      <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {organization.website}
                      </a>
                    ) : (
                      "Not set"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Industry</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{organization.industry || "Not set"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Country</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{organization.country || "Not set"}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Description</p>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                  {organization.description || "No description added yet."}
                </p>
              </div>
              {!isOwner && (
                <p className="text-[13px] text-slate-500">
                  Only the workspace owner can edit the organization profile.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>
    </div>
  );
}