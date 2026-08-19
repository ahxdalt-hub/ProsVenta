// ============================================================================
// Prosventa Import & Export Database Layer
// Stage 3 — Phase 6: Import & Export Center
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ImportHistoryRecord,
  ExportHistoryRecord,
  ImportError,
  ImportStatus,
  ExportFormat,
  ExportScope,
  DuplicateStrategy,
} from "@/features/io/types";

// ============================================================================
// Import History
// ============================================================================

interface CreateImportHistoryInput {
  organization_id: string;
  created_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: ImportStatus;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  updated_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  errors: ImportError[];
  column_mapping: Record<string, string>;
  duplicate_strategy: DuplicateStrategy;
  duration_ms?: number | null;
}

export async function createImportHistory(
  input: CreateImportHistoryInput
): Promise<ImportHistoryRecord | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("import_history")
    .insert(input)
    .select()
    .single();

  return data;
}

export async function updateImportHistory(
  id: string,
  updates: Partial<CreateImportHistoryInput> & { completed_at?: string }
): Promise<ImportHistoryRecord | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("import_history")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return data;
}

export async function getImportHistory(): Promise<ImportHistoryRecord[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("import_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function deleteImportHistory(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("import_history")
    .delete()
    .eq("id", id);

  return !error;
}

// ============================================================================
// Export History
// ============================================================================

interface CreateExportHistoryInput {
  organization_id: string;
  created_by: string;
  file_name: string;
  format: ExportFormat;
  status: "processing" | "completed" | "failed";
  scope: ExportScope;
  saved_view_id?: string | null;
  total_rows: number;
  duration_ms?: number | null;
}

export async function createExportHistory(
  input: CreateExportHistoryInput
): Promise<ExportHistoryRecord | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("export_history")
    .insert(input)
    .select()
    .single();

  return data;
}

export async function updateExportHistory(
  id: string,
  updates: Partial<CreateExportHistoryInput> & { completed_at?: string }
): Promise<ExportHistoryRecord | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("export_history")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return data;
}

export async function getExportHistory(): Promise<ExportHistoryRecord[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("export_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function deleteExportHistory(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("export_history")
    .delete()
    .eq("id", id);

  return !error;
}