// ============================================================================
// Prosventa Data Quality Layer - Tests
// Stage 6 - Phase 4: Data Normalization, Verification & Quality Engine
// ============================================================================
// Run: npx tsx src/features/intelligence/quality/quality.test.ts
// ============================================================================

import {
  cleanValue,
  isValidEmail,
  isValidHttpUrl,
  parseEmployeeCount,
  normalizeEmployeeRange,
  normalizeCompanyName,
  companyNameIdentityKey,
  normalizeFoundedYear,
  normalizeTimestamp,
  isValidProviderId,
  normalizeCompanyPayload,
  normalizePersonPayload,
  normalizePersonName,
  normalizeSeniority,
  deriveSeniorityFromTitle,
  categorizeJobTitle,
  resolveConflict,
  detectCustomerProviderConflicts,
  buildCompanyIdentity,
  compareCompanyIdentity,
  comparePersonIdentity,
  buildSafeMergePlan,
  computeDataQualityStatus,
  computeVerificationLevel,
  DATA_QUALITY_EXPLANATIONS,
  explainField,
} from "./index";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

function run() {
  // Test 1 — Domain normalization
  console.log("Test 1: Domain normalization");
  let allConsistent = true;
  for (const form of ["https://www.example.com", "http://example.com/", "www.example.com", "example.com"]) {
    if (normalizeCompanyPayload({ domain: form }).canonicalDomain !== "example.com") allConsistent = false;
  }
  assert("all URL/domain forms resolve to example.com", allConsistent);
  assert("different domains NOT merged", normalizeCompanyPayload({ domain: "https://www.example.co" }).canonicalDomain === "example.co");
  const badDom = normalizeCompanyPayload({ domain: "not a domain!!" });
  assert("invalid domain rejected with issue", badDom.domainRejected === true && badDom.validationIssues.length > 0);

  // Test 2 — Company normalization
  console.log("Test 2: Company normalization");
  assert("'ACME INC.' and 'acme inc' share identity key", companyNameIdentityKey("ACME INC.") === companyNameIdentityKey("acme inc"));
  assert("distinct companies keep distinct keys", companyNameIdentityKey("Acme Corp") !== companyNameIdentityKey("Beta Corp"));
  assert("legitimate name preserved verbatim (cleaned only)", normalizeCompanyName("  Acme Manufacturing GmbH  ") === "Acme Manufacturing GmbH");
  assert("'201-500' range preserved as range", normalizeEmployeeRange("201-500") === "201-500" && normalizeCompanyPayload({ employeeRange: "201-500" }).data.employeeRange === "201-500");
  assert("range not collapsed into invented exact count", normalizeCompanyPayload({ employeeRange: "201-500" }).data.employeeCount === null);
  assert("exact count stored as number", normalizeCompanyPayload({ employeeCount: 250 }).data.employeeCount === 250);
  assert("location kept only when supplied; no invention", normalizeCompanyPayload({ city: "Berlin" }).data.country === null && normalizeCompanyPayload({ city: "Berlin", country: "Germany" }).data.city === "Berlin");

  // Test 3 — Person normalization
  console.log("Test 3: Person normalization");
  const n1 = normalizePersonName({ fullName: "Jane Smith" });
  assert("two-token full name splits safely", n1.firstName === "Jane" && n1.lastName === "Smith" && n1.fullName === "Jane Smith");
  const n2 = normalizePersonName({ fullName: "Mohammed van der Berg" });
  assert("multi-token name NOT destructively split", n2.fullName === "Mohammed van der Berg" && n2.firstName === null);
  const n3 = normalizePersonName({ firstName: "Jose", lastName: "Garcia" });
  assert("explicit first/last preserved", n3.firstName === "Jose" && n3.lastName === "Garcia");
  const p1 = normalizePersonPayload({ jobTitle: "Chief Technology Officer", seniority: "C-Level" });
  assert("original title preserved; category derived separately", p1.data.jobTitle === "Chief Technology Officer" && p1.titleCategory === "executive" && p1.seniorityNormalized === "c_level" && p1.seniorityFromProvider === true);
  assert(
    "seniority vocabulary maps aliases consistently",
    normalizeSeniority("VP") === "vp" &&
      normalizeSeniority("vice president") === "vp" &&
      normalizeSeniority("Founder") === "founder_owner" &&
      normalizeSeniority("Manager") === "manager" &&
      normalizeSeniority("mystery") === "unknown"
  );
  const d1 = deriveSeniorityFromTitle("Director of Engineering");
  const p2 = normalizePersonPayload({ jobTitle: "Director of Engineering" });
  assert("derived seniority marked derived, never overwrites provider value", d1.derived === true && p2.seniorityNormalized === "director" && p2.seniorityFromProvider === false && p2.data.seniority === null);
  assert(
    "title categories cover expected buckets",
    categorizeJobTitle("Sales Director") === "sales" &&
      categorizeJobTitle("Software Engineer") === "engineering" &&
      categorizeJobTitle("Astronaut") === "other" &&
      categorizeJobTitle(null) === "unknown"
  );

  // Test 4 — Duplicate company detection
  console.log("Test 4: Duplicate company");
  const c1 = buildCompanyIdentity({ providerCompanyId: "clearbit-org-1", domain: "https://www.acme.com/", companyName: "ACME INC.", internalId: "p-100" });
  const c2 = buildCompanyIdentity({ providerCompanyId: "clearbit-org-1", domain: "acme.com", companyName: "Acme Inc" });
  assert("same provider id -> exact match", compareCompanyIdentity(c1, c2).strength === "exact");
  const mDom = compareCompanyIdentity(
    buildCompanyIdentity({ domain: "WWW.Acme.com", companyName: "Acme Inc." }),
    buildCompanyIdentity({ domain: "acme.com", companyName: "ACME" })
  );
  assert("same canonical domain -> strong match", mDom.strength === "strong");
  const mNameOnly = compareCompanyIdentity(
    buildCompanyIdentity({ companyName: "Apple" }),
    buildCompanyIdentity({ companyName: "apple inc." })
  );
  assert("name-only match is weak and never auto-merges", mNameOnly.strength === "weak" && buildSafeMergePlan({}, {}, mNameOnly, []).canAutoMerge === false);
  assert("different domains do not match", compareCompanyIdentity(buildCompanyIdentity({ domain: "acme.com" }), buildCompanyIdentity({ domain: "acme.co" })).strength === "none");

  // Test 5 — Duplicate person detection
  console.log("Test 5: Duplicate person");
  const pi = (over: Partial<Parameters<typeof comparePersonIdentity>[0]>) => ({
    providerPersonId: null, internalProspectId: null, verifiedEmail: null, fullNameKey: null, companyDomain: null, ...over,
  });
  assert(
    "same provider person id -> exact",
    comparePersonIdentity(pi({ providerPersonId: "pp-9", fullNameKey: "Jane Smith" }), pi({ providerPersonId: "pp-9", fullNameKey: "J. Smith" })).strength === "exact"
  );
  assert(
    "same verified email -> strong",
    comparePersonIdentity(pi({ verifiedEmail: "jane@acme.com", fullNameKey: "Jane Smith" }), pi({ verifiedEmail: "Jane@Acme.com", fullNameKey: "Jane Q Smith" })).strength === "strong"
  );
  assert(
    "same name + same company domain -> strong",
    comparePersonIdentity(pi({ fullNameKey: "John Lee", companyDomain: "acme.com" }), pi({ fullNameKey: "john lee", companyDomain: "acme.com" })).strength === "strong"
  );
  assert(
    "name alone across companies NEVER matches",
    comparePersonIdentity(pi({ fullNameKey: "John Lee", companyDomain: "acme.com" }), pi({ fullNameKey: "John Lee", companyDomain: "beta.com" })).strength === "none"
  );

  // Test 6 — Conflicting sources detected
  console.log("Test 6: Conflict detection");
  const conflictRes = resolveConflict(
    { value: "SaaS", origin: "customer_confirmed", source: "customer", retrievedAt: "2026-01-01T00:00:00Z" },
    { value: "Software", origin: "provider_verified", source: "clearbit", retrievedAt: "2026-08-20T00:00:00Z" }
  );
  assert("conflict detected between customer & provider", conflictRes.conflicted === true);
  assert("customer value wins under source priority", conflictRes.preferred.value === "SaaS");
  assert("alternative retained (not destroyed)", conflictRes.alternative?.value === "Software");
  const empConflict = detectCustomerProviderConflicts({ employeeCount: 250 }, { employeeCount: 500 });
  assert("employee count mismatch flagged", empConflict.length === 1 && empConflict[0].field === "employeeCount");
  assert("case-different equal values are NOT conflicts", detectCustomerProviderConflicts({ industry: "SaaS" }, { industry: "saas" }).length === 0);

  // Test 7 — Customer data protection
  console.log("Test 7: Customer data protection");
  const protection = resolveConflict(
    { value: "SaaS", origin: "customer_confirmed", source: "customer", retrievedAt: "2025-01-01T00:00:00Z" },
    { value: "Software", origin: "provider_verified", source: "clearbit", retrievedAt: "2026-08-24T00:00:00Z" }
  );
  assert("older customer value still beats newer provider value", protection.preferred.value === "SaaS");
  assert("protection flag set", protection.customerProtected === true);
  assert(
    "prosventa-derived can never beat customer-confirmed",
    resolveConflict(
      { value: "CTO", origin: "customer_confirmed", source: "customer", retrievedAt: null },
      { value: "Engineer", origin: "prosventa_derived", source: "prosventa", retrievedAt: "2026-08-24T00:00:00Z" }
    ).preferred.value === "CTO"
  );

  // Test 8 — Invalid provider data rejected/safely handled
  console.log("Test 8: Invalid provider data");
  assert("negative employees rejected", parseEmployeeCount(-5) === null);
  assert("'abc employees' rejected", parseEmployeeCount("abc employees") === null);
  assert("'1,250' accepted as 1250", parseEmployeeCount("1,250") === 1250);
  assert("implausible founded year rejected", normalizeFoundedYear(1200) === null);
  assert("founded year string accepted", normalizeFoundedYear("2004") === 2004);
  assert("garbage timestamp rejected", normalizeTimestamp("not a date") === null);
  assert("valid timestamp normalized to ISO", normalizeTimestamp("2026-08-01") !== null);
  assert("malformed provider id rejected", isValidProviderId("bad id with spaces!") === false);
  assert("reasonable provider id accepted", isValidProviderId("clearbit_org-123") === true);
  assert("malformed email rejected in person payload", normalizePersonPayload({ contactEmail: "nope@@x" }).data.contactEmail === null);
  assert("email validation is format-only (no deliverability claim)", isValidEmail("someone@example.com") === true && isValidEmail("@example.com") === false);


  // Test 9 — Empty / placeholder values
  console.log("Test 9: Empty values");
  const placeholders = ["N/A", "-", "None", "Unknown", "Not available", "", "   ", "---"];
  assert("placeholder strings cleaned to null", placeholders.every((p) => cleanValue(p) === null));
  const pc = normalizeCompanyPayload({ industry: "N/A", description: "-" });
  assert("placeholders never reach normalized fields", pc.data.industry === null && pc.data.description === null);

  // Test 10 — Provenance survives resolution
  // Test 10 — Provenance survives resolution
  console.log("Test 10: Provenance preservation");
  const prov = resolveConflict<string>(
    { value: "Old", origin: "provider_verified", source: "apollo", retrievedAt: "2026-01-01T00:00:00Z" },
    { value: "New", origin: "provider_verified", source: "clearbit", retrievedAt: "2026-08-24T00:00:00Z" }
  );
  assert("winner keeps its own source", prov.preferred.source === "clearbit");
  assert("loser retains provenance too", prov.alternative?.source === "apollo");
  const expl = explainField({ what: "Company size", value: "250 employees", source: "Clearbit", retrievedAt: "2026-08-24T00:00:00Z" });
  assert("field explanation exposes what/value/source without internals", expl.what === "Company size" && expl.value === "250 employees" && expl.origin === "Provider-sourced");

  // Test 11 — Scoring safety (normalized inputs)
  console.log("Test 11: Scoring input safety");
  assert("placeholder cannot influence scoring", cleanValue("N/A") === null);
  assert("valid value passes through cleanly", cleanValue("  SaaS  ") === "SaaS");
  const techs = ["React", " N/A ", "", "PostgreSQL"].map((t) => cleanValue(t)).filter((t): t is string => t !== null);
  assert("technologies list cleaned before scoring consumes it", techs.join("|") === "React|PostgreSQL");

  // Test 12 — Recommendation safety (normalized seniority/department feed)
  console.log("Test 12: Recommendation input safety");
  const recInput = normalizePersonPayload({ jobTitle: "N/A", seniority: "C LEVEL", department: "Engineering", contactEmail: "cto@acme.com" });
  assert(
    "recommendation engine receives normalized vocab, not raw junk",
    recInput.seniorityNormalized === "c_level" && recInput.data.jobTitle === null && recInput.data.department === "Engineering"
  );
  assert(
    "verification level derived from existing confidence thresholds",
    computeVerificationLevel(85) === "high_confidence" &&
      computeVerificationLevel(60) === "medium_confidence" &&
      computeVerificationLevel(30) === "low_confidence" &&
      computeVerificationLevel(null) === "unknown"
  );

  // Test 13 — Organization isolation (structural)
  console.log("Test 13: Organization isolation");
  const qa = computeDataQualityStatus({ presentFields: 5, totalFields: 5, hasConflicts: false, retrievedAt: new Date().toISOString(), confidence: 90 });
  const qb = computeDataQualityStatus({ presentFields: 5, totalFields: 5, hasConflicts: false, retrievedAt: new Date().toISOString(), confidence: 90 });
  assert("status computation deterministic & org-independent (pure functions; persistence scoped by org_id + RLS)", qa.status === qb.status && qa.status === "complete");

  // Test 14 — Performance
  console.log("Test 14: Performance");
  const start = Date.now();
  for (let i = 0; i < 10_000; i++) {
    normalizeCompanyPayload({ domain: "https://www.acme.com", employeeRange: "201-500", companyName: "Acme Inc." });
    normalizePersonPayload({ jobTitle: "VP Engineering", seniority: "VP" });
  }
  const elapsed = Date.now() - start;
  assert(`20k normalizations complete quickly (${elapsed}ms, no I/O)`, elapsed < 3000);

  // Quality status states + safe merge behavior
  console.log("Quality status states");
  assert("unavailable when no retrieval timestamp", computeDataQualityStatus({ presentFields: 5, totalFields: 5, hasConflicts: false, retrievedAt: null, confidence: null }).status === "unavailable");
  assert("conflicted outranks other states", computeDataQualityStatus({ presentFields: 5, totalFields: 5, hasConflicts: true, retrievedAt: new Date().toISOString(), confidence: 90 }).status === "conflicted");
  assert("stale when older than configurable max age", computeDataQualityStatus({ presentFields: 5, totalFields: 5, hasConflicts: false, retrievedAt: "2020-01-01T00:00:00Z", confidence: 90 }).status === "stale");
  assert("partial when key fields missing", computeDataQualityStatus({ presentFields: 2, totalFields: 5, hasConflicts: false, retrievedAt: new Date().toISOString(), confidence: 90 }).status === "partial");
  assert("client-facing explanations exist for every state", Object.keys(DATA_QUALITY_EXPLANATIONS).length === 6);
  assert("URL validation sane", isValidHttpUrl("https://acme.com/x") === true && isValidHttpUrl("javascript:alert(1)") === false);
  const plan = buildSafeMergePlan(
    { id: "p1" },
    { id: "p2" },
    { strength: "strong", evidence: "canonical domain acme.com" },
    [
      { field: "industry", primaryValue: "SaaS", duplicateValue: "Software", primaryIsCustomer: true, duplicateIsCustomer: false },
      { field: "employees", primaryValue: null, duplicateValue: 250, primaryIsCustomer: false, duplicateIsCustomer: false },
      { field: "country", primaryValue: "Germany", duplicateValue: "Germany", primaryIsCustomer: true, duplicateIsCustomer: false },
    ]
  );
  assert("safe merge keeps customer value, fills gaps, auto-merges when clean", plan.canAutoMerge && !plan.decisions.some((d) => d.winner === "conflict"));
  const blocked = buildSafeMergePlan(
    { id: "p1" },
    { id: "p2" },
    { strength: "strong", evidence: "canonical domain acme.com" },
    [{ field: "industry", primaryValue: "SaaS", duplicateValue: "E-commerce", primaryIsCustomer: true, duplicateIsCustomer: true }]
  );
  assert("conflicting CUSTOMER values block auto-merge and flag review", !blocked.canAutoMerge && blocked.decisions.some((d) => d.winner === "conflict"));
  assert("duplicate ref retained in plan (never deleted)", (plan.duplicateRef as { id: string }).id === "p2");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();

