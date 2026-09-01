import type { IconName } from "../navigation/icons";

export interface PaletteCommand {
  id: string;
  label: string;
  href: string;
  section: CommandSection;
  icon: IconName;
  description?: string;
  keywords?: string[];
  provider?: string;
}

export type CommandSection = "Main" | "Workspace" | "Settings";

export const COMMAND_SECTIONS: CommandSection[] = ["Main", "Workspace", "Settings"];

export const COMMAND_LIST: readonly PaletteCommand[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    section: "Main",
    icon: "dashboard",
    description: "Overview of your workspace",
    keywords: ["home", "overview", "start"],
  },
  {
    id: "prospects",
    label: "Prospects",
    href: "/dashboard/prospects",
    section: "Main",
    icon: "prospects",
    description: "Manage your prospect pipeline",
    keywords: ["leads", "pipeline", "crm", "contacts", "search"],
  },
  {
    id: "saved-lists",
    label: "Saved Lists",
    href: "/dashboard/saved-lists",
    section: "Main",
    icon: "lists",
    description: "Organized prospect collections",
    keywords: ["collections", "segments", "folders"],
  },
  {
    id: "import",
    label: "Import",
    href: "/dashboard/import",
    section: "Main",
    icon: "import",
    description: "Import prospects from CSV or Excel",
    keywords: ["upload", "csv", "excel", "xlsx", "data", "file"],
  },
  {
    id: "organization",
    label: "Organization",
    href: "/dashboard/organization",
    section: "Workspace",
    icon: "organization",
    description: "Company workspace settings",
    keywords: ["company", "workspace", "team"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    section: "Settings",
    icon: "settings",
    description: "Personal preferences and account",
    keywords: ["preferences", "account", "profile"],
  },
  {
    id: "help",
    label: "Help",
    href: "/dashboard/help",
    section: "Settings",
    icon: "help",
    description: "Documentation and support",
    keywords: ["support", "docs", "guide", "contact"],
  },
];

/**
 * Search index built once at module load — zero runtime cost.
 */
const SEARCH_INDEX: readonly string[] = COMMAND_LIST.map((c) =>
  [c.label, c.description ?? "", c.keywords?.join(" ") ?? ""].join(" ").toLowerCase()
);

/**
 * Score a command against a query.
 * Returns 0 (no match) to 1 (perfect match).
 */
export function scoreCommand(command: PaletteCommand, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const haystack = SEARCH_INDEX[COMMAND_LIST.indexOf(command)];

  if (command.label.toLowerCase() === q) return 1;
  if (command.label.toLowerCase().startsWith(q)) return 0.92;
  if (command.label.toLowerCase().includes(q)) return 0.78;
  if (haystack.includes(q)) return 0.5;
  return 0;
}

/**
 * Get commands in a section, preserving source order.
 */
export function getCommandsForSection(section: CommandSection): PaletteCommand[] {
  return COMMAND_LIST.filter((c) => c.section === section);
}
