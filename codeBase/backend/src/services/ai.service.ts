import {
  GraphRunResult,
  runAnalysisGraph,
} from "../ai/analysis.graph.js";
import { IAnalysisResult } from "../models/repoAnalysis.model.js";
import {
  canonicalRepoUrl,
  detectEntryCandidates,
  getFileContent,
  getRepoTree,
  getSourceFiles,
  parseRepoUrl,
  RepoMeta,
  TreeNode,
} from "./github.service.js";
import { ParsedRepo, parseRepo } from "./parser.service.js";
import { config } from "../config/config.js";
import {
  AliasMapping,
  getDependencyAliases,
} from "../utils/dependencyResolution.js";
import { truncateContent } from "../utils/repoFiltering.js";
import {
  AnalysisError,
  AnalysisStatus,
  GitHubServiceError,
  analysisError,
  errorToAnalysisError,
} from "../types/error.js";

export interface AIServiceResult {
  result: IAnalysisResult | null;
  errors: AnalysisError[];
  warnings: AnalysisError[];
  status: AnalysisStatus;
  success: boolean;
}

const githubToAnalysisError = (err: GitHubServiceError): AnalysisError => {
  switch (err.kind) {
    case "UNAUTHORIZED":
      return analysisError(
        "GITHUB",
        "GITHUB_AUTH_FAILED",
        "GitHub authentication failed. Please verify the token configuration.",
        false,
        err.context,
        err.message,
      );
    case "FORBIDDEN":
      return analysisError(
        "GITHUB",
        "GITHUB_ACCESS_DENIED",
        "Access to the repository was denied.",
        false,
        err.context,
        err.message,
      );
    case "NOT_FOUND":
      return analysisError(
        "GITHUB",
        "REPOSITORY_NOT_FOUND",
        "Repository not found or is private.",
        false,
        err.context,
        err.message,
      );
    case "RATE_LIMITED":
      return analysisError(
        "GITHUB",
        "GITHUB_RATE_LIMITED",
        "GitHub API rate limit exceeded. Retry later.",
        true,
        err.context,
        err.message,
      );
    case "FILE_NOT_FOUND":
      return analysisError(
        "GITHUB",
        "FILE_NOT_FOUND",
        "A source file could not be fetched from the repository.",
        true,
        err.context,
        err.message,
      );
    case "NETWORK":
      return analysisError(
        "GITHUB",
        "GITHUB_NETWORK_ERROR",
        "Network error while contacting GitHub.",
        true,
        err.context,
        err.message,
      );
    default:
      return analysisError(
        "GITHUB",
        "GITHUB_ERROR",
        "Unexpected GitHub API error.",
        true,
        err.context,
        err.message,
      );
  }
};

/** build m2 context - fetch actual content of entry candidates => token usage low */
const resolveEntryContents = async (
  meta: RepoMeta,
  candidates: string[],
): Promise<{
  contents: Array<{ path: string; content: string }>;
  errors: AnalysisError[];
}> => {
  const contents: Array<{ path: string; content: string }> = [];
  const errors: AnalysisError[] = [];
  const largeFileLimitBytes = config.GITHUB_LARGE_FILE_LIMIT_KB * 1024;

  for (const path of candidates.slice(0, config.M2_MAX_ENTRY_CONTENTS)) {
    try {
      const file = await getFileContent(meta, path);
      contents.push({
        path: file.path,
        content: truncateContent(file.content, largeFileLimitBytes),
      });
    } catch (err) {
      const ghErr =
        err instanceof GitHubServiceError
          ? err
          : new GitHubServiceError(
              "UNKNOWN",
              "Failed to fetch entry file content.",
              { repo: canonicalRepoUrl(meta), path },
              err,
            );
      errors.push(githubToAnalysisError(ghErr));
    }
  }

  return { contents, errors };
};

/** Best-effort alias discovery from tsconfig.json / jsconfig.json in the tree. */
const resolveRepoAliases = async (
  meta: RepoMeta,
  tree: TreeNode[],
): Promise<AliasMapping[]> => {
  const configFiles = tree
    .filter((n) => n.type === "blob")
    .map((n) => n.path)
    .filter((p) => p === "tsconfig.json" || p === "jsconfig.json")
    .slice(0, 1);

  if (!configFiles.length) {
    return getDependencyAliases();
  }

  try {
    const file = await getFileContent(meta, configFiles[0]);
    return getDependencyAliases(file.content);
  } catch {
    return getDependencyAliases();
  }
};

const failedResult = (
  errors: AnalysisError[],
  warnings: AnalysisError[] = [],
): AIServiceResult => ({
  result: null,
  errors,
  warnings,
  status: "failed",
  success: false,
});

/**Main Orchestrator
 * full pipeline:- repoUrl → GitHub fetch → Parse AST/Regex → M2 Context Fetch → LangGraph → IAnalysisResult
 */
const analyseRepository = async (repoUrl: string): Promise<AIServiceResult> => {
  let meta: RepoMeta;
  try {
    meta = parseRepoUrl(repoUrl);
  } catch (err) {
    return failedResult([
      errorToAnalysisError(
        err,
        "INPUT",
        "INVALID_REPOSITORY_URL",
        "The provided URL is not a valid GitHub repository URL.",
        false,
      ),
    ]);
  }
  const repoId = canonicalRepoUrl(meta);

  let tree: TreeNode[];
  try {
    tree = await getRepoTree(meta);
  } catch (err) {
    const ghErr =
      err instanceof GitHubServiceError
        ? err
        : new GitHubServiceError(
            "UNKNOWN",
            "Failed to fetch repository tree.",
            { repo: repoId },
            err,
          );
    return failedResult([githubToAnalysisError(ghErr)]);
  }

  const warnings: AnalysisError[] = [];

  const { files, errors: sourceErrors, skipped } = await getSourceFiles(
    meta,
    tree,
  );
  warnings.push(...sourceErrors.map(githubToAnalysisError));
  for (const skip of skipped) {
    warnings.push(
      analysisError(
        "GITHUB",
        "SOURCE_FILE_SKIPPED",
        `Skipped '${skip.path}' (${skip.reason}).`,
        false,
        {
          file: skip.path,
          reason: skip.reason,
          ...(typeof skip.size === "number" ? { size: skip.size } : {}),
        },
      ),
    );
  }

  if (!files.length) {
    const errors =
      warnings.length > 0
        ? warnings
        : [
            analysisError(
              "GITHUB",
              "NO_SOURCE_FILES",
              "No valid source code files were found in the repository.",
              false,
              { repo: repoId },
            ),
          ];
    return failedResult(errors);
  }

  const parsedRepo: ParsedRepo = parseRepo(files);
  warnings.push(...parsedRepo.errors);

  const entryCandidates = detectEntryCandidates(tree);
  const { contents, errors: entryErrors } = await resolveEntryContents(
    meta,
    entryCandidates,
  );
  warnings.push(...entryErrors);

  const dependencyAliases = await resolveRepoAliases(meta, tree);

  const graphResult: GraphRunResult = await runAnalysisGraph({
    parsedRepo,
    entryCandidates,
    entryContents: contents,
    dependencyAliases,
  });

  return {
    result: graphResult.result,
    errors: graphResult.errors,
    warnings,
    status: graphResult.status,
    success: graphResult.status !== "failed",
  };
};

export const aiService = {
  analyseRepository,
};

export default aiService;