"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { updateOrganizationAction } from "@/features/organization/actions/organization";
import type { Organization } from "@/types/database";

interface OrganizationProfileFormProps {
  organization: Organization;
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

export function OrganizationProfileForm({ organization, isOwner }: OrganizationProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: organization.name || "",
    website: organization.website || "",
    industry: organization.industry || "",
    country: organization.country || "",
    description: organization.description || "",
  });

  function handleCancel() {
    setForm({
      name: organization.name || "",
      website: organization.website || "",
      industry: organization.industry || "",
      country: organization.country || "",
      description: organization.description || "",
    });
    setError(null);
    setIsEditing(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateOrganizationAction({
        name: form.name,
        website: form.website || undefined,
        industry: form.industry || undefined,
        country: form.country || undefined,
        description: form.description || undefined,
      });
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <Card>
      <CardHeader
        title="Organization Profile"
        description="Update your workspace information"
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-4h6v4" />
          </svg>
        }
        action={
          isOwner && !isEditing ? (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit
            </Button>
          ) : null
        }
      />
      <div className="p-6 pt-4">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onSubmit={handleSubmit} className="space-y-4">
              <Input label="Company Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Corporation" required />
              <Input label="Website" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Industry" name="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </Select>
                <Input label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. United States" />
              </div>
              <Textarea label="Description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of your organization" rows={3} />
              {error && (<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</div>)}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isPending}>Cancel</Button>
                <Button type="submit" loading={isPending} disabled={!form.name.trim()}>Save Changes</Button>
              </div>
            </motion.form>
          ) : (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Company Name</p><p className="mt-1 text-sm font-semibold text-slate-900">{organization.name || "Not set"}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Website</p><p className="mt-1 text-sm font-semibold text-slate-900">{organization.website ? (<a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organization.website}</a>) : "Not set"}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Industry</p><p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{organization.industry || "Not set"}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Country</p><p className="mt-1 text-sm font-semibold text-slate-900">{organization.country || "Not set"}</p></div>
              </div>
              <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Description</p><p className="mt-1 text-sm text-slate-700">{organization.description || "No description added yet."}</p></div>
              {!isOwner && (<p className="text-xs text-slate-400">Only the workspace owner can edit the organization profile.</p>)}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Organization profile updated successfully.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
