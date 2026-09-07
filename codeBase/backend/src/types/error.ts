export type AnalysisStage =
  | "INPUT"
  | "GITHUB"
  | "PARSE"
  | "AI"
  | "M1"
  | "M2"
  | "M3"
  | "COMBINE"
  | "DB"
  | "TIMEOUT"
  | "SYSTEM";

export type AnalysisStatus = "completed" | "partial" | "failed";

export interface AnalysisError {
  stage: AnalysisStage;
  code: string;
  message: string;
  retryable: boolean;
  context?: Record<string, unknown>;
  cause?: string;
}

export type PublicAnalysisError = {
  stage: AnalysisStage;
  code: string;
  message: string;
  retryable: boolean;
  context?: Record<string, unknown>;
};

export type GitHubErrorKind =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "FILE_NOT_FOUND"
  | "NETWORK"
  | "INVALID_URL"
  | "UNKNOWN";

export class GitHubServiceError extends Error {
  readonly kind: GitHubErrorKind;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(
    kind: GitHubErrorKind,
    message: string,
    context?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.name = "GitHubServiceError";
    this.kind = kind;
    this.context = context;
    this.cause = cause;
  }
}

export const analysisError = (
  stage: AnalysisStage,
  code: string,
  message: string,
  retryable: boolean,
  context?: Record<string, unknown>,
  cause?: string,
): AnalysisError => ({
  stage,
  code,
  message,
  retryable,
  ...(context ? { context } : {}),
  ...(cause ? { cause } : {}),
});

export const errorToAnalysisError = (
  err: unknown,
  stage: AnalysisStage,
  code: string,
  message: string,
  retryable = true,
): AnalysisError =>
  analysisError(
    stage,
    code,
    message,
    retryable,
    undefined,
    err instanceof Error ? err.message : String(err),
  );

export const stripCauseForPersistence = (e: AnalysisError): AnalysisError => ({
  stage: e.stage,
  code: e.code,
  message: e.message,
  retryable: e.retryable,
  ...(e.context ? { context: e.context } : {}),
});

export const toPublicAnalysisError = (
  e: AnalysisError,
): PublicAnalysisError => ({
  stage: e.stage,
  code: e.code,
  message: e.message,
  retryable: e.retryable,
  ...(e.context ? { context: e.context } : {}),
});