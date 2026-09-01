// ============================================================================
// Prosventa Automation Control Center — Data Layer
// Stage 7 — Phase 5
// ============================================================================
// A monitoring & management layer ON TOP of the existing Phase 4 orchestrator.
// Reads the EXISTING `workflow_executions` / `workflow_action_executions`
// records through RLS — no duplicated execution data, no second engine.
//
// Query design:
//   - Overview  : bounded COUNT queries + small capped lists (no step payloads)
//   - Lists     : server-side filtering + pagination (never unlimited fetches)
//   - Detail    : one execution + its step records only (no intelligence blobs)
// ============================================================================

import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------------------
// Auth helper — same pattern as the rest of Stage 7 (org membership, never
// trusting org IDs from the browser).
// ----------------------------------------------------------------------------

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  return (membership?.organization_id as string) ?? null;
}

// ----------------------------------------------------------------------------
// Shared view types
// ----------------------------------------------------------------------------

export interface ExecutionSummary {
  id: string;
  status: string;
  prospect_id: string | null;
  prospect_name: string | null;
  playbook_id: string | null;
  playbook_version: number | null;
  playbook_name: string | null;
  reason: string | null;
  current_step_index: number;
  total_steps: number | null;
  error_message: string | null;
  failure_category: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ControlCenterOverview {
  runningCount: number;
  attentionCount: number;
  completedTodayCount: number;
  activePlaybookCount: number;
  hasAnyExecutions: boolean;
  running: ExecutionSummary[];
  attention: ExecutionSummary[];
  recent: ExecutionSummary[];
}

export interface HistoryFilters {
  status?: string;
  playbookId?: string;
  search?: string;
  range?: "today" | "7d" | "30d" | "";
  page: number;
  pageSize: number;
}

export interface HistoryResult {
  executions: ExecutionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const LIST_COLUMNS =
  "id,status,prospect_id,prospect_name,playbook_id,playbook_version,current_step_index,error_message,failure_category,created_at,started_at,completed_at,reason:metadata->>reason,playbook_name:metadata->>playbook_name";

function mapSummary(row: Record<string, unknown>): ExecutionSummary {
  return {
    id: row.id as string,
    status: row.status as string,
    prospect_id: (row.prospect_id as string) ?? null,
    prospect_name: (row.prospect_name as string) ?? null,
    playbook_id: (row.playbook_id as string) ?? null,
    playbook_version: (row.playbook_version as number | null) ?? null,
    playbook_name: (row.playbook_name as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    current_step_index: (row.current_step_index as number) ?? 0,
    total_steps: (row.total_steps as number | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    failure_category: (row.failure_category as string | null) ?? null,
    created_at: row.created_at as string,
    started_at: (row.started_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

// ----------------------------------------------------------------------------
// Overview — real counts only, honest emptiness upstream
// ----------------------------------------------------------------------------

export async function getControlCenterOverview(): Promise<ControlCenterOverview> {
  const orgId = await getOrgId();
  const empty: ControlCenterOverview = {
    runningCount: 0,
    attentionCount: 0,
    completedTodayCount: 0,
    activePlaybookCount: 0,
    hasAnyExecutions: false,
    running: [],
    attention: [],
    recent: [],
  };
  if (!orgId) return empty;

  const supabase = await createClient();

  // Phase 6: surface lost-worker executions honestly before reading state.
  // Runs under this user's session → RLS scopes it to this organization.
  try {
    const { reconcileStuckExecutions } = await import("@/lib/db/automation-executions");
    await reconcileStuckExecutions();
  } catch {
    // Reconciliation is best-effort — the overview must always render.
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [runningCount, attentionCount, completedToday, activePlaybooks, anyExec] =
    await Promise.all([
      supabase
        .from("workflow_executions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("status", ["queued", "running", "waiting"]),
      supabase
        .from("workflow_executions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("status", ["failed", "paused"]),
      supabase
        .from("workflow_executions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "completed")
        .gte("completed_at", startOfToday.toISOString()),
      supabase
        .from("playbooks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active"),
      supabase
        .from("workflow_executions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
    ]);

  // Running + needs-attention lists are naturally small; recent is capped at 8.
  const [runningRows, attentionRows, recentRows] = await Promise.all([
    supabase
      .from("workflow_executions")
      .select(LIST_COLUMNS)
      .eq("organization_id", orgId)
      .in("status", ["queued", "running", "waiting"])
      .order("started_at", { ascending: true })
      .limit(20),
    supabase
      .from("workflow_executions")
      .select(LIST_COLUMNS)
      .eq("organization_id", orgId)
      .in("status", ["failed", "paused"])
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from("workflow_executions")
      .select(LIST_COLUMNS)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    runningCount: runningCount.count ?? 0,
    attentionCount: attentionCount.count ?? 0,
    completedTodayCount: completedToday.count ?? 0,
    activePlaybookCount: activePlaybooks.count ?? 0,
    hasAnyExecutions: (anyExec.count ?? 0) > 0,
    running: ((runningRows.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapSummary),
    attention: ((attentionRows.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapSummary),
    recent: ((recentRows.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapSummary),
  };
}

// ----------------------------------------------------------------------------
// History — searchable, filterable, paginated (server-side)
// ----------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listControlCenterExecutions(
  filters: HistoryFilters
): Promise<HistoryResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize || 20));
  const noop: HistoryResult = { executions: [], total: 0, page, pageSize };
  const orgId = await getOrgId();
  if (!orgId) return noop;

  const supabase = await createClient();

  let query = supabase
    .from("workflow_executions")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("organization_id", orgId);

  if (filters.status && filters.status !== "all") {
    if (filters.status === "attention") {
      query = query.in("status", ["failed", "paused"]);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters.playbookId && UUID_RE.test(filters.playbookId)) {
    query = query.eq("playbook_id", filters.playbookId);
  }
  if (filters.range) {
    let since: Date;
    if (filters.range === "today") {
      since = new Date();
      since.setHours(0, 0, 0, 0);
    } else {
      const days = filters.range === "7d" ? 7 : 30;
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    query = query.gte("created_at", since.toISOString());
  }

  const search = filters.search?.trim();
  if (search && !UUID_RE.test(search)) {
    // Playbook-name search resolves to real playbook IDs first — search always
    // operates against actual data, never client-side over unbounded rows.
    const { data: matching } = await supabase
      .from("playbooks")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", `%${search}%`)
      .limit(50);
    const ids = (matching ?? []).map((p) => p.id as string);
    if (ids.length === 0) return noop;
    query = query.in("playbook_id", ids);
  }
  if (search) {
    const orParts = [`prospect_name.ilike.%${search}%`];
    if (UUID_RE.test(search)) orParts.push(`id.eq.${search}`);
    query = query.or(orParts.join(","));
  }

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    executions: ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapSummary),
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Playbook options for the history filter (org-scoped, minimal columns). */
export async function getPlaybookFilterOptions(): Promise<Array<{ id: string; name: string }>> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("playbooks")
    .select("id,name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as Array<{ id: string; name: string }>;
}

// ----------------------------------------------------------------------------
// Execution detail — auditability: trigger → version → steps → final state
// ----------------------------------------------------------------------------

export interface ExecutionStepView {
  id: string;
  step_index: number | null;
  action_type: string;
  status: string;
  attempt_count: number;
  error: string | null;
  error_category: string | null;
  output: Record<string, unknown>;
  started_at: string | null;
  executed_at: string | null;
}

export interface ExecutionDetail {
  id: string;
  status: string;
  prospect_id: string | null;
  prospect_name: string | null;
  playbook_id: string | null;
  playbook_name: string;
  playbook_version: number | null;
  playbook_status: string | null;
  reason: string | null;
  trigger_type: string | null;
  error_message: string | null;
  failure_category: string | null;
  cancel_reason: string | null;
  current_step_index: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  origin_chain_depth: number;
  steps: ExecutionStepView[];
  /** Upcoming steps come from the playbook's CURRENT definition (labeled). */
  upcoming_steps: Array<{ position: number; title: string; action_type: string }>;
}

export async function getExecutionDetail(executionId: string): Promise<ExecutionDetail | null> {
  const orgId = await getOrgId();
  if (!orgId || !UUID_RE.test(executionId)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .eq("organization_id", orgId)
    .maybeSingle();
  const exec = data as Record<string, unknown> | null;
  if (!exec) return null;

  const metadata = (exec.metadata ?? {}) as Record<string, unknown>;
  const context = (exec.execution_context ?? {}) as Record<string, unknown>;
  const triggerEvent = (context.trigger_event ?? {}) as Record<string, unknown>;
  const triggerType =
    (triggerEvent.event_type as string | null) ??
    (metadata.origin_type as string | null) ??
    null;
  const playbookId = exec.playbook_id as string | null;
  const status = exec.status as string;

  // Playbook status only — the recorded name/version in metadata is
  // authoritative for what the execution actually ran (never rewritten).
  let playbookStatus: string | null = null;
  if (playbookId) {
    const { data: pb } = await supabase
      .from("playbooks")
      .select("status")
      .eq("id", playbookId)
      .eq("organization_id", orgId)
      .maybeSingle();
    playbookStatus = (pb?.status as string) ?? null;
  }

  const { data: stepRows } = await supabase
    .from("workflow_action_executions")
    .select("id,step_index,action_type,status,attempt_count,error,error_category,output,executed_at,created_at")
    .eq("execution_id", executionId)
    .order("created_at", { ascending: true });

  // Remaining steps for ACTIVE executions come from the playbook's current
  // definition. Historical steps always come from recorded action rows.
  let upcoming: Array<{ position: number; title: string; action_type: string }> = [];
  if (playbookId && ["queued", "running", "waiting", "paused"].includes(status)) {
    const { data: pbSteps } = await supabase
      .from("playbook_steps")
      .select("position,title,action_type,enabled")
      .eq("playbook_id", playbookId)
      .eq("organization_id", orgId)
      .order("position", { ascending: true });
    const done = new Set(
      ((stepRows ?? []) as unknown as Array<Record<string, unknown>>)
        .map((s) => s.step_index as number)
        .filter((i) => i !== null && i !== undefined)
    );
    upcoming = ((pbSteps ?? []) as unknown as Array<Record<string, unknown>>)
      .filter((s) => s.enabled === true && !done.has(s.position as number))
      .slice(0, 10)
      .map((s) => ({
        position: s.position as number,
        title: s.title as string,
        action_type: s.action_type as string,
      }));
  }

  return {
    id: exec.id as string,
    status,
    prospect_id: (exec.prospect_id as string) ?? null,
    prospect_name: (exec.prospect_name as string) ?? null,
    playbook_id: playbookId,
    playbook_name:
      (metadata.playbook_name as string) ?? (metadata.workflow_name as string) ?? "Automation",
    playbook_version:
      (exec.playbook_version as number | null) ??
      (metadata.playbook_version as number | null) ??
      null,
    playbook_status: playbookStatus,
    reason: (metadata.reason as string | null) ?? null,
    trigger_type: triggerType,
    error_message: (exec.error_message as string) ?? null,
    failure_category: (exec.failure_category as string) ?? null,
    cancel_reason: (exec.cancel_reason as string) ?? null,
    current_step_index: (exec.current_step_index as number) ?? 0,
    created_by: (exec.created_by as string) ?? null,
    created_at: exec.created_at as string,
    started_at: (exec.started_at as string) ?? null,
    completed_at: (exec.completed_at as string) ?? null,
    origin_chain_depth: (exec.origin_chain_depth as number) ?? 0,
    steps: ((stepRows ?? []) as unknown as Array<Record<string, unknown>>).map((s) => ({
      id: s.id as string,
      step_index: (s.step_index as number | null) ?? null,
      action_type: s.action_type as string,
      status: s.status as string,
      attempt_count: (s.attempt_count as number) ?? 1,
      error: (s.error as string | null) ?? null,
      error_category: (s.error_category as string | null) ?? null,
      output: (s.output as Record<string, unknown>) ?? {},
      started_at: (s.created_at as string) ?? null,
      executed_at: (s.executed_at as string | null) ?? null,
    })),
    upcoming_steps: upcoming,
  };
}

