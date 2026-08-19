"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: "productivity" | "crm" | "automation" | "data" | "communication";
  icon: React.ReactNode;
  status: "available" | "coming-soon";
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Sync contacts, calendar events, and email activity",
    category: "productivity",
    status: "coming-soon",
    color: "#4285F4",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Connect Outlook, Teams, and SharePoint",
    category: "productivity",
    status: "coming-soon",
    color: "#0078D4",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 3h9v9H2V3zm11 0h9v9h-9V3zM2 14h9v9H2v-9zm11 0h9v9h-9v-9z" />
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get prospect updates and alerts in your channels",
    category: "communication",
    status: "coming-soon",
    color: "#4A154B",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.958 8.834a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.958a2.528 2.528 0 0 1 2.521 2.52 2.528 2.528 0 0 1-2.521 2.522 2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.166a2.527 2.527 0 0 1-2.522 2.521h-6.312z" />
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    description: "Push prospects and notes to your Notion workspace",
    category: "productivity",
    status: "coming-soon",
    color: "#000000",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607l-13.2.793c-.28.047-.28.373-.28.653l.187 2.401zM5.588 6.503c-.327.047-.42.327-.42.653v12.13c0 .28.187.513.42.513l14.42-.793c.28 0 .42-.233.42-.653V6.13c0-.28-.14-.513-.42-.513l-14.42.886z" />
      </svg>
    ),
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Two-way sync with your HubSpot CRM",
    category: "crm",
    status: "coming-soon",
    color: "#FF7A59",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.1 6.7V5.4c0-.5-.4-.9-.9-.9h-1.3c-.5 0-.9.4-.9.9v1.3c-.7.4-1.2 1.1-1.2 2v8.1c0 .5.4.9.9.9h3.7c.5 0 .9-.4.9-.9V8.7c0-.9-.5-1.6-1.2-2zM5.9 8.2c-.4 0-.7.1-1 .3V5.4c0-.5-.4-.9-.9-.9H2.7c-.5 0-.9.4-.9.9v1.3c0 .5.4.9.9.9h.4v8.1h-.4c-.5 0-.9.4-.9.9v1.3c0 .5.4.9.9.9h1.3c.5 0 .9-.4.9-.9v-1.3c.4.2.7.3 1 .3 1.5 0 2.7-1.2 2.7-2.7V10.9c0-1.5-1.2-2.7-2.7-2.7zm0 4.5c-.4 0-.7-.1-1-.3v-2.4c.3-.2.6-.3 1-.3.7 0 1.2.5 1.2 1.2v.6c0 .7-.5 1.2-1.2 1.2z" />
      </svg>
    ),
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect Prosventa to 5,000+ apps with Zaps",
    category: "automation",
    status: "coming-soon",
    color: "#FF4F00",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 12l10 10 10-10L12 2zm0 4.8l5.2 5.2L12 17.2 6.8 12 12 6.8z" />
      </svg>
    ),
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Send real-time events to your own endpoints",
    category: "automation",
    status: "coming-soon",
    color: "#64748B",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    ),
  },
  {
    id: "api",
    name: "API Access",
    description: "Build custom integrations with the Prosventa API",
    category: "data",
    status: "coming-soon",
    color: "#2563EB",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

const CATEGORY_LABELS: Record<Integration["category"], string> = {
  productivity: "Productivity",
  crm: "CRM",
  automation: "Automation",
  data: "Data & API",
  communication: "Communication",
};

export function IntegrationsSection() {
  const [filter, setFilter] = useState<"all" | Integration["category"]>("all");
  const { info: toastInfo } = useToast();

  const filtered =
    filter === "all"
      ? INTEGRATIONS
      : INTEGRATIONS.filter((i) => i.category === filter);

  const categories: ("all" | Integration["category"])[] = [
    "all",
    "productivity",
    "crm",
    "automation",
    "data",
    "communication",
  ];

  function handleConnect(integration: Integration) {
    toastInfo(
      `${integration.name} integration`,
      "This integration is coming soon. We are actively building it."
    );
  }

  return (
    <div className="space-y-6">
      {/* Header note */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3.5">
        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p className="text-sm text-blue-800 leading-relaxed">
          Connect Prosventa to your favorite tools. Integrations are being built and will be available soon.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              filter === cat
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
            aria-pressed={filter === cat}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((integration) => (
          <motion.div
            key={integration.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="settings-card-interactive rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {integration.name}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">
                    {integration.description}
                  </p>
                </div>
              </div>
              <Badge variant="neutral">{CATEGORY_LABELS[integration.category]}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Coming soon
              </span>
              <button
                type="button"
                onClick={() => handleConnect(integration)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
              >
                Connect
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* API access card */}
      <SettingsCard>
        <SettingsCardHeader
          title="Developer Resources"
          description="Build custom integrations with the Prosventa platform"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          }
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">API Documentation</p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Explore endpoints, authentication, and rate limits
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View docs
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">API Keys</p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Manage your API keys and access tokens
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Manage keys
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Webhook Endpoints</p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Configure endpoints to receive real-time events
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Configure
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}