"use client";

import { useRef, useState, useTransition } from "react";
import { createDiscoverySearch } from "@/features/prospects/actions/discovery";
import type { DiscoverySearchRecord } from "@/features/prospects/types/discovery";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface DiscoveryFormProps {
  onSubmit?: (search: DiscoverySearchRecord) => void;
}

export function DiscoveryForm({ onSubmit }: DiscoveryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createDiscoverySearch(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      if (result.search && onSubmit) {
        onSubmit(result.search);
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <Input
        id="industry"
        name="industry"
        type="text"
        label="Industry"
        placeholder="e.g. SaaS, Healthcare, Real Estate"
      />

      <Input
        id="location"
        name="location"
        type="text"
        label="Location"
        placeholder="e.g. New York, London, Remote"
      />

      <Select id="companySize" name="companySize" label="Company Size" defaultValue="">
        <option value="">Any size</option>
        <option value="1-10">1–10 employees</option>
        <option value="11-50">11–50 employees</option>
        <option value="51-200">51–200 employees</option>
        <option value="201-500">201–500 employees</option>
        <option value="501-1000">501–1000 employees</option>
        <option value="1000+">1000+ employees</option>
      </Select>

      <Textarea
        id="keywords"
        name="keywords"
        rows={3}
        label="Keywords"
        placeholder="e.g. AI, machine learning, fintech, B2B"
      />

      {error && (
        <Alert variant="error" title="Unable to create search">
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        loading={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? "Preparing search…" : "Find Prospects"}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        Your search request will be queued for processing. Results will appear
        in the prospects workspace as they become ready.
      </p>
    </form>
  );
}