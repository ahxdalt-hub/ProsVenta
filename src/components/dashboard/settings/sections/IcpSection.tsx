"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast";
import { getWorkspaceIcpAction, saveWorkspaceIcpAction, resetWorkspaceIcpAction } from "@/features/intelligence/scoring/icp-actions";
import { createEmptyIcpCriteria, type IcpCriteria, type IcpConfiguration } from "@/features/intelligence/scoring/types";

export function IcpSection() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const [name, setName] = useState("Default ICP");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<IcpCriteria>(createEmptyIcpCriteria());

  // Load existing ICP config
  useEffect(() => {
    let cancelled = false;
    getWorkspaceIcpAction().then((result: { error: string | null; config: IcpConfiguration | null }) => {
      if (cancelled) return;
      if (result.config) {
        setName(result.config.name);
        setDescription(result.config.description ?? "");
        setCriteria(result.config.criteria);
      }
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const updateCompany = useCallback((patch: Partial<IcpCriteria["company"]>) => {
    setCriteria((prev) => ({ ...prev, company: { ...prev.company, ...patch } }));
  }, []);

  const updateProspect = useCallback((patch: Partial<IcpCriteria["prospect"]>) => {
    setCriteria((prev) => ({ ...prev, prospect: { ...prev.prospect, ...patch } }));
  }, []);

  const handleSave = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await saveWorkspaceIcpAction({ name, description, criteria });
      if (result.error) {
        setError(result.error);
        toastError("Failed to save ICP", result.error);
        return;
      }
      toastSuccess("ICP saved", "Your Ideal Customer Profile has been updated.");
    });
  }, [name, description, criteria, toastSuccess, toastError]);

  const handleReset = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await resetWorkspaceIcpAction();
      if (result.error) {
        setError(result.error);
        toastError("Failed to reset ICP", result.error);
        return;
      }
      setCriteria(createEmptyIcpCriteria());
      toastSuccess("ICP reset", "Your Ideal Customer Profile has been cleared.");
    });
  }, [toastSuccess, toastError]);

  if (isLoading) {
    return (
      <SettingsCard>
        <div className="space-y-4">
          <div className="premium-skeleton h-6 w-48" />
          <div className="premium-skeleton h-10 w-full" />
          <div className="premium-skeleton h-10 w-full" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard>
        <SettingsCardHeader
          title="Ideal Customer Profile"
          description="Define the company and prospect characteristics that make a strong fit for your business."
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        <div className="space-y-4">
          <Input
            label="ICP Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mid-market B2B SaaS"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your ideal customer profile..."
            rows={2}
          />
        </div>
      </SettingsCard>

      {/* Company Criteria */}
      <SettingsCard>
        <SettingsCardHeader
          title="Company Criteria"
          description="What does the ideal company look like?"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4" />
            </svg>
          }
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Industries (comma-separated)"
              value={criteria.company.targetIndustries.join(", ")}
              onChange={(e) => updateCompany({ targetIndustries: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Software, SaaS, Fintech"
            />
            <Input
              label="Excluded Industries"
              value={criteria.company.excludedIndustries.join(", ")}
              onChange={(e) => updateCompany({ excludedIndustries: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Government, Nonprofit"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Company Sizes"
              value={criteria.company.targetCompanySizes.join(", ")}
              onChange={(e) => updateCompany({ targetCompanySizes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. 51-200, 201-500"
            />
            <Input
              label="Target Countries"
              value={criteria.company.targetCountries.join(", ")}
              onChange={(e) => updateCompany({ targetCountries: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. United States, Germany"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Min Employees"
              type="number"
              value={criteria.company.minEmployees ?? ""}
              onChange={(e) => updateCompany({ minEmployees: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 50"
            />
            <Input
              label="Max Employees"
              type="number"
              value={criteria.company.maxEmployees ?? ""}
              onChange={(e) => updateCompany({ maxEmployees: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Company Types"
              value={criteria.company.targetCompanyTypes.join(", ")}
              onChange={(e) => updateCompany({ targetCompanyTypes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Private, Public"
            />
            <Input
              label="Target Technologies"
              value={criteria.company.targetTechnologies.join(", ")}
              onChange={(e) => updateCompany({ targetTechnologies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Salesforce, HubSpot"
            />
          </div>
          <Input
            label="Target Business Models"
            value={criteria.company.targetBusinessModels.join(", ")}
            onChange={(e) => updateCompany({ targetBusinessModels: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
            placeholder="e.g. B2B, B2C, Marketplace"
          />
        </div>
      </SettingsCard>

      {/* Prospect Criteria */}
      <SettingsCard>
        <SettingsCardHeader
          title="Prospect Criteria"
          description="What does the ideal contact look like?"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Job Titles"
              value={criteria.prospect.targetJobTitles.join(", ")}
              onChange={(e) => updateProspect({ targetJobTitles: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. VP Sales, Head of Marketing"
            />
            <Input
              label="Target Departments"
              value={criteria.prospect.targetDepartments.join(", ")}
              onChange={(e) => updateProspect({ targetDepartments: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Sales, Marketing, Engineering"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Seniority Levels"
              value={criteria.prospect.targetSeniorityLevels.join(", ")}
              onChange={(e) => updateProspect({ targetSeniorityLevels: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. C-level, VP, Director"
            />
            <Input
              label="Target Locations"
              value={criteria.prospect.targetLocations.join(", ")}
              onChange={(e) => updateProspect({ targetLocations: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. New York, London"
            />
          </div>
          <Input
            label="Excluded Roles"
            value={criteria.prospect.excludedRoles.join(", ")}
            onChange={(e) => updateProspect({ excludedRoles: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
            placeholder="e.g. Recruiter, Intern"
          />
        </div>
      </SettingsCard>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={handleReset} disabled={isPending}>
          Reset / Clear ICP
        </Button>
        <Button onClick={handleSave} loading={isPending} disabled={!name.trim()}>
          Save ICP
        </Button>
      </div>
    </div>
  );
}