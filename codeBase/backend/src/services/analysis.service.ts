import crypto from "crypto";
import { config } from "../config/config.js";
import analysisDAO from "../dao/analysis.dao.js";
import aiService, { AIServiceResult } from "./ai.service.js";
import {
  canonicalRepoUrl,
  parseRepoUrl,
} from "./github.service.js";
import {
  AnalysisError,
  GitHubServiceError,
  analysisError,
  stripCauseForPersistence,
} from "../types/error.js";
import { IAnalysisResult, IRepoAnalysis } from "../models/repoAnalysis.model.js";

export type AnalyzeOutcome =
  | {
      ok: true;
      cached: boolean;
      record: IRepoAnalysis;
      warnings: AnalysisError[];
    }
  | {
      ok: false;
      code: "INVALID_URL" | "SERVICE_UNAVAILABLE" | "INTERNAL";
      message: string;
    };

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const hashMeta = (meta: { owner: string; repo: string }): string => {
  return crypto
    .createHash("sha256")
    .update(canonicalRepoUrl(meta))
    .digest("hex");
};

type FinalStatus = "completed" | "partial" | "failed";

const finalizeRecord = (
  id: string,
  status: FinalStatus,
  result: IAnalysisResult | null,
  errors: AnalysisError[],
): Promise<IRepoAnalysis | null> => {
  const persistedErrors = errors.map(stripCauseForPersistence);
  if (status === "completed") {
    return analysisDAO.markCompleted(id, result!, persistedErrors);
  }
  if (status === "partial") {
    return analysisDAO.markPartial(id, result!, persistedErrors);
  }
  return analysisDAO.markFailed(id, persistedErrors);
};

export const analyzeRepository = async (
  repoUrl: string,
): Promise<AnalyzeOutcome> => {
  // Normalize the URL and generate a deterministic hash from the canonical identifier.
  let canonicalUrl: string;
  let hash: string;
  try {
    const meta = parseRepoUrl(repoUrl);
    canonicalUrl = canonicalRepoUrl(meta);
    hash = hashMeta(meta);
  } catch (err) {
    if (err instanceof GitHubServiceError && err.kind === "INVALID_URL") {
      return {
        ok: false,
        code: "INVALID_URL",
        message: "The provided URL is not a valid GitHub repository URL.",
      };
    }
    return {
      ok: false,
      code: "INVALID_URL",
      message: "The provided repository URL could not be parsed.",
    };
  }

  // Cache lookup — do not silently turn a DB failure into a cache miss.
  let cached: IRepoAnalysis | null;
  try {
    cached = await analysisDAO.findByUrlHash(hash);
  } catch (err) {
    console.error(
      "[Analysis Service] Cache lookup failed:",
      getErrorMessage(err),
    );
    return {
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      message:
        "Analysis service is temporarily unavailable. Please retry later.",
    };
  }
  if (cached) {
    return { ok: true, cached: true, record: cached, warnings: [] };
  }

  // Create the analysis record — do not start expensive analysis if it cannot be persisted.
  let record: IRepoAnalysis;
  try {
    record = await analysisDAO.create({
      userId: null,
      repoUrl: canonicalUrl,
      repoUrlHash: hash,
      jobId: crypto.randomUUID(),
    });
  } catch (err) {
    console.error(
      "[Analysis Service] Failed to create analysis record:",
      getErrorMessage(err),
    );
    return {
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      message:
        "Analysis service is temporarily unavailable. Please retry later.",
    };
  }

  const id = record._id.toString();

  try {
    await analysisDAO.markActive(id);
  } catch (err) {
    console.error(
      "[Analysis Service] Failed to mark record active:",
      getErrorMessage(err),
    );
  }

  const timeoutMs = config.ANALYSIS_TIMEOUT_MS;
  let finalized = false;

  const finalize = async (
    status: FinalStatus,
    result: IAnalysisResult | null,
    errors: AnalysisError[],
  ): Promise<IRepoAnalysis | null> => {
    if (finalized) return null;
    finalized = true;
    try {
      return await finalizeRecord(id, status, result, errors);
    } catch (err) {
      console.error(
        "[Analysis Service] Failed to persist final state:",
        getErrorMessage(err),
      );
      return null;
    }
  };

  const analysisPromise = aiService
    .analyseRepository(canonicalUrl)
    .then(async (res: AIServiceResult) => {
      const persisted = await finalize(
        res.status,
        res.result,
        res.errors,
      );
      return { kind: "done" as const, res, persisted };
    });

  const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
    setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });

  const outcome = await Promise.race([analysisPromise, timeoutPromise]);

  if (outcome.kind === "timeout") {
    const timeoutError = analysisError(
      "TIMEOUT",
      "ANALYSIS_TIMEOUT",
      `Analysis exceeded the ${Math.round(timeoutMs / 1000)}s timeout.`,
      true,
    );
    const persisted = await finalize("failed", null, [timeoutError]);
    if (!persisted) {
      return {
        ok: false,
        code: "SERVICE_UNAVAILABLE",
        message:
          "Analysis timed out and the outcome could not be persisted. Please retry later.",
      };
    }
    return {
      ok: true,
      cached: false,
      record: persisted,
      warnings: [],
    };
  }

  const { res, persisted } = outcome;
  if (!persisted) {
    return {
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      message:
        "Analysis completed but the result could not be persisted. Please retry later.",
    };
  }

  return {
    ok: true,
    cached: false,
    record: persisted,
    warnings: res.warnings,
  };
};

export const analysisService = { analyzeRepository };

export default analysisService;