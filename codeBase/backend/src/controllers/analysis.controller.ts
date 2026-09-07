import { Request, Response } from "express";
import { analyzeRepository } from "../services/analysis.service.js";
import { repoUrlSchema } from "../validators/repoAnalysis.validator.js";
import {
  AnalysisError,
  PublicAnalysisError,
  toPublicAnalysisError,
} from "../types/error.js";

const toPublicErrors = (
  errors: Array<AnalysisError | PublicAnalysisError>,
): PublicAnalysisError[] => errors.map(toPublicAnalysisError);

export const analyzeRepo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = repoUrlSchema.safeParse(req.body?.repoUrl);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "repoUrl must be a valid HTTPS GitHub repository URL",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const outcome = await analyzeRepository(parsed.data);

  if (!outcome.ok) {
    switch (outcome.code) {
      case "INVALID_URL":
        res.status(400).json({ success: false, message: outcome.message });
        return;
      case "SERVICE_UNAVAILABLE":
        res.status(503).json({ success: false, message: outcome.message });
        return;
      default:
        res
          .status(500)
          .json({
            success: false,
            message: "Unexpected error while analyzing the repository.",
          });
        return;
    }
  }

  const { record, cached } = outcome;
  const status = record.status;
  const isSuccess = status !== "failed";
  const errors = toPublicErrors(record.analysisErrors ?? []);
  const warnings = toPublicErrors(outcome.warnings);

  const message =
    status === "completed"
      ? "Analysis completed"
      : status === "partial"
        ? "Analysis completed with partial results"
        : "Analysis failed";

  res.status(200).json({
    success: isSuccess,
    cached,
    status,
    message,
    analysisId: record._id.toString(),
    ...(record.result ? { data: record.result } : {}),
    ...(errors.length ? { errors } : {}),
    ...(warnings.length ? { warnings } : {}),
  });
};