// Diagnostic: replicate dashboard/prospects page.tsx data flow exactly.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const token = readFileSync(process.env.TEMP + "\\jwt.txt", "utf8").trim();

const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});

async function step(name, fn) {
  try {
    const r = await fn();
    console.log(`[OK]   ${name}`, JSON.stringify(r).slice(0, 120));
  } catch (e) {
    console.log(`[THROW] ${name} >>>`, e.message ?? e);
  }
}

const t0 = Date.now();

// ensureOrganization()
await step("ensureOrganization/membership", async () => {
  const { data: user, error: ue } = await supabase.auth.getUser();
  if (ue) throw ue;
  const { data: m, error: me } = await supabase
    .from("organization_members").select("*").eq("user_id", user.user.id)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (me) throw me;
  if (!m) return "NO MEMBERSHIP";
  const { data: org, error: oe } = await supabase
    .from("organizations").select("*").eq("id", m.organization_id).single();
  if (oe) throw oe;
  return { org: org.name, id: org.id };
});

// queryProspects core
await step("queryProspects", async () => {
  const { data, count, error } = await supabase
    .from("prospects")
    .select("*, prospect_scores(score, category)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 24);
  if (error) throw error;
  return { rows: data?.length, count };
});

await step("getDistinctIndustries", async () => {
  const { data, error } = await supabase.from("prospects").select("industry").not("industry", "is", null).order("industry");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.industry)).size;
});

await step("getDistinctCountries", async () => {
  const { data, error } = await supabase.from("prospects").select("country").not("country", "is", null).order("country");
  if (error) throw error;
  return (data ?? []).length;
});

await step("getDistinctSources", async () => {
  const { data, error } = await supabase.from("prospects").select("source").not("source", "is", null);
  if (error) throw error;
  return (data ?? []).length;
});

await step("getDistinctTags", async () => {
  const { data, error } = await supabase.from("prospects").select("tags").not("tags", "is", null);
  if (error) throw error;
  return (data ?? []).length;
});

await step("getOrganizationMembers", async () => {
  const { data: ud } = await supabase.auth.getUser();
  const { data: m, error: me } = await supabase.from("organization_members").select("organization_id")
    .eq("user_id", ud.user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (me) throw me;
  if (!m) return "no membership";
  const { data: members, error: e2 } = await supabase.from("organization_members").select("user_id").eq("organization_id", m.organization_id);
  if (e2) throw e2;
  const ids = (members ?? []).map((x) => x.user_id);
  const { data: profiles, error: e3 } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (e3) throw e3;
  return { members: members?.length, profiles: profiles?.length };
});

await step("getSavedLists", async () => {
  const { data, error } = await supabase.from("saved_lists").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).length;
});

// recommendations enhancement query inside queryProspects
await step("recommendations-query", async () => {
  const { data, error } = await supabase.from("recommendations")
    .select("prospect_id, recommendation_type, priority")
    .in("prospect_id", ["d7fd4982-af84-433d-97d1-cdd1138e7f71"])
    .neq("status", "dismissed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).length;
});

console.log("done in", Date.now() - t0, "ms");
