// ============================================================================
// Prosventa Signals — Candidate Gathering
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Gathers candidate signals for ONE company from all supported sources.
// Cost control (spec §25): at most ONE request per provider per run; board
// slugs are resolved BEFORE any network call; failures are contained per
// provider so one broken source never corrupts the whole run.
//
// Leadership/funding events flow through whatever external signal provider
// is configured. No credentials exist in this environment yet, so those
// signal types stay honestly unavailable rather than pretending to work.
// ============================================================================

import { randomUUID } from "node:crypto";
import { IntelligenceError } from "../../errors";
import { normalizeDomain } from "../../domain";
import type { CandidateSignal, DetectionContext } from "./types";
import type { ExternalSignalDetectionRequest } from "../external/types";
import { HiringSignalDetector } from "./detectors/hiring";
import type { HiringDetectorInput } from "./detectors/hiring";
import { LeadershipSignalDetector } from "./detectors/leadership";
import { FundingSignalDetector } from "./detectors/funding";
import {
  GREENHOUSE_PROVIDER_ID,
  resolveGreenhouseSlug,
  fetchGreenhousePostings,
  greenhouseBoardUrl,
} from "./providers/greenhouse";
import {
  LEVER_PROVIDER_ID,
  resolveLeverSlug,
  fetchLeverPostings,
  leverBoardUrl,
} from "./providers/lever";

export interface DetectionTarget {
  orgId: string;
  prospectId: string | null;
  domain: string | null;
  companyName: string | null;
}

export interface GatheredResult {
  candidates: CandidateSignal[];
  providersUsed: string[];
  errors: Array<{ provider: string; code: string }>;
}

export function makeDetectionContext() {
  return { orgId: "", runId: randomUUID(), nowIso: new Date().toISOString() };
}

const hiringDetector = new HiringSignalDetector();
const leadershipDetector = new LeadershipSignalDetector();
const fundingDetector = new FundingSignalDetector();

export async function gatherCandidates(
  target: DetectionTarget,
  ctx: DetectionContext,
  options: GatherOptions = {}
): Promise<GatheredResult> {
  const candidates: GatheredResult["candidates"] = [];
  const providersUsed: string[] = [];
  const errors: Array<{ provider: string; code: string }> = [];

  const domain = normalizeDomain(target.domain) ?? null;
  const request: ExternalSignalDetectionRequest = {
    companyId: target.prospectId,
    domain,
    companyName: target.companyName,
  };

  // --- Priority 1: hiring activity via public ATS boards -------------------
  const ghFetch = options.atsFetchers?.greenhouse ?? fetchGreenhousePostings;
  const lvFetch = options.atsFetchers?.lever ?? fetchLeverPostings;

  for (const board of [
    {
      id: GREENHOUSE_PROVIDER_ID,
      slug: resolveGreenhouseSlug(request),
      fetch: ghFetch,
      boardUrl: greenhouseBoardUrl,
    },
    {
      id: LEVER_PROVIDER_ID,
      slug: resolveLeverSlug(request),
      fetch: lvFetch,
      boardUrl: leverBoardUrl,
    },
  ]) {
    if (!board.slug) continue;
    providersUsed.push(board.id);
    const result = await board.fetch(board.slug);
    if (result.errorCode || !result.postings) {
      errors.push({
        provider: board.id,
        code: result.errorCode ?? "UNKNOWN_PROVIDER_ERROR",
      });
      continue;
    }
    const input: HiringDetectorInput = {
      providerId: board.id,
      boardSlug: board.slug,
      companyName: target.companyName,
      domain,
      postings: result.postings,
      boardUrl: board.boardUrl(board.slug),
    };
    candidates.push(...hiringDetector.detect(input, ctx));
  }

  // --- Leadership / funding via a configured external signal provider ------
  try {
    const { resolveExternalSignalProvider } = await import("../external/provider");
    const provider = await resolveExternalSignalProvider(target.orgId);
    if (provider) {
      const providerId = provider.getConfig().id;
      providersUsed.push(providerId);
      const rawEvents = await provider.detectExternalSignals(request);
      for (const candidate of [
        ...leadershipDetector.detect(rawEvents, ctx),
        ...fundingDetector.detect(rawEvents, ctx),
      ]) {
        candidate.provider = providerId;
        candidate.evidence.provider = providerId;
        candidate.companyKey = domain;
        candidates.push(candidate);
      }
    }
  } catch (error) {
    const intelError =
      error instanceof IntelligenceError
        ? error
        : new IntelligenceError("UNKNOWN_PROVIDER_ERROR", { cause: error });
    errors.push({ provider: "external-signals", code: intelError.code });
  }

  return { candidates, providersUsed, errors };
}

export interface GatherOptions {
  atsFetchers?: {
    greenhouse?: typeof fetchGreenhousePostings;
    lever?: typeof fetchLeverPostings;
  };
}
