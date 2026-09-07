import { Octokit } from "@octokit/rest";
import { config } from "../config/config.js";
import {
  SKIP_DIRECTORIES,
  SOURCE_EXTENSIONS,
} from "../config/repo.constants.js";
import { GitHubServiceError } from "../types/error.js";
import { filterEntryCandidates } from "../utils/entryCandidates.js";
import {
  isBinaryContent,
  isOverSizeLimit,
  isSkippedPath,
  planSourceSelection,
  SkippedSourceFile,
  truncateContent,
} from "../utils/repoFiltering.js";

/**
 * Interfaces
 */
export interface RepoMeta {
  owner: string;
  repo: string;
}

export interface TreeNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  size?: number;
}

export interface SourceFileFetchResult {
  files: FileContent[];
  errors: GitHubServiceError[];
  skipped: SkippedSourceFile[];
}

let octokit: Octokit;

if (config.GITHUB_TOKEN) {
  octokit = new Octokit({
    auth: config.GITHUB_TOKEN,
  });
} else {
  console.warn(
    "[GitHub Service] GITHUB_TOKEN not configured - using public API only (rate limits apply, private repos inaccessible)",
  );
  octokit = new Octokit();
}

/**
 * Extract owner and repo name from a GitHub repository URL.
 * Accepts https://github.com/<owner>/<repo>, optional www., trailing slash, and .git suffix.
 */
export const parseRepoUrl = (url: string): RepoMeta => {
  if (!url || !url.trim()) {
    throw new GitHubServiceError("INVALID_URL", "Repository URL is required.");
  }

  const trimmed = url.trim();
  const match = trimmed.match(
    /^(?:https:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]+)(?:\/?|\.git\/?)$/,
  );

  if (!match) {
    throw new GitHubServiceError(
      "INVALID_URL",
      "Invalid GitHub repository URL. Expected a URL like https://github.com/<owner>/<repo>.",
      { url: trimmed },
    );
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, "").replace(/\/+$/, ""),
  };
};

/** Canonical, normalized repository identifier used as the deterministic cache key base. */
export const canonicalRepoUrl = (meta: RepoMeta): string =>
  `https://github.com/${meta.owner}/${meta.repo}`;

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const classifyGitHubError = (
  err: unknown,
  context: Record<string, unknown>,
  fileLookup = false,
): GitHubServiceError => {
  if (err instanceof GitHubServiceError) {
    return err;
  }

  const maybeRequestError = err as {
    status?: number;
    response?: { headers?: Record<string, string> };
  };
  const status = maybeRequestError?.status;
  const rawMessage = getErrorMessage(err).toLowerCase();

  switch (status) {
    case 401:
      return new GitHubServiceError(
        "UNAUTHORIZED",
        "GitHub authentication failed. Verify that GITHUB_TOKEN is valid.",
        context,
        err,
      );
    case 403: {
      const rateLimited =
        maybeRequestError?.response?.headers?.["x-ratelimit-remaining"] === "0";
      return new GitHubServiceError(
        rateLimited ? "RATE_LIMITED" : "FORBIDDEN",
        rateLimited
          ? "GitHub API rate limit reached. Retry later."
          : "Access to this resource is forbidden.",
        context,
        err,
      );
    }
    case 404:
      return new GitHubServiceError(
        fileLookup ? "FILE_NOT_FOUND" : "NOT_FOUND",
        fileLookup
          ? "A source file could not be found in the repository."
          : "Repository not found or is private.",
        context,
        err,
      );
    default:
      if (
        /econnreset|econnrefused|enotfound|etimedout|eai_again|socket hang up|network/i.test(
          rawMessage,
        )
      ) {
        return new GitHubServiceError(
          "NETWORK",
          "Network error while contacting GitHub.",
          context,
          err,
        );
      }
      return new GitHubServiceError(
        "UNKNOWN",
        "Unexpected GitHub API error.",
        context,
        err,
      );
  }
};

/**
 * Selects the repository's default branch from GitHub metadata.
 * Never assumes a specific branch name; a repository without a default branch
 * is surfaced as an explicit, controlled error.
 */
export const selectDefaultBranch = (repoMeta: {
  default_branch?: string;
}): string => {
  const branch = repoMeta.default_branch;
  if (!branch || !branch.trim()) {
    throw new GitHubServiceError(
      "NOT_FOUND",
      "Repository does not expose a default branch.",
      { branch: "missing" },
    );
  }
  return branch.trim();
};

const getDefaultBranch = async (meta: RepoMeta): Promise<string> => {
  try {
    const { data } = await octokit.repos.get({
      owner: meta.owner,
      repo: meta.repo,
    });
    return selectDefaultBranch(data);
  } catch (err) {
    throw classifyGitHubError(err, {
      repo: canonicalRepoUrl(meta),
      stage: "branch_resolution",
    });
  }
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getRepoTree = async (meta: RepoMeta): Promise<TreeNode[]> => {
  try {
    const defaultBranch = await getDefaultBranch(meta);

    const { data } = await octokit.git.getTree({
      owner: meta.owner,
      repo: meta.repo,
      tree_sha: defaultBranch,
      recursive: "1",
    });

    if (data.truncated) {
      console.warn(
        "[GitHub Service] Tree truncated by GitHub - repository is very large.",
      );
    }

    const nodes: TreeNode[] = [];
    for (const node of data.tree) {
      if (node.type !== "blob" && node.type !== "tree") continue;
      if (!node.path || isSkippedPath(node.path)) continue;
      nodes.push({
        path: node.path,
        type: node.type,
        sha: node.sha,
        ...(typeof node.size === "number" ? { size: node.size } : {}),
      });
    }

    return nodes;
  } catch (err) {
    console.error(
      `[GitHub Service] Error fetching tree for ${meta.owner}/${meta.repo}:`,
      getErrorMessage(err),
    );
    throw classifyGitHubError(err, {
      repo: canonicalRepoUrl(meta),
    });
  }
};

export const filterDirs = (tree: TreeNode[]): TreeNode[] => {
  return tree.filter((node) => node.type === "tree");
};

export const detectEntryCandidates = (tree: TreeNode[]): string[] => {
  const paths = tree
    .filter((node) => node.type === "blob")
    .map((node) => node.path);
  return filterEntryCandidates(paths);
};

export const getFileContent = async (
  meta: RepoMeta,
  path: string,
): Promise<FileContent> => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: meta.owner,
      repo: meta.repo,
      path,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new GitHubServiceError(
        "UNKNOWN",
        `Path '${path}' is not a file.`,
        { repo: canonicalRepoUrl(meta), path },
      );
    }

    return {
      path,
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      size: data.size,
    };
  } catch (err) {
    throw classifyGitHubError(
      err,
      {
        repo: canonicalRepoUrl(meta),
        path,
      },
      true,
    );
  }
};

export const getSourceFiles = async (
  meta: RepoMeta,
  tree: TreeNode[],
): Promise<SourceFileFetchResult> => {
  const largeFileLimitBytes = config.GITHUB_LARGE_FILE_LIMIT_KB * 1024;

  const selection = planSourceSelection(
    tree.filter((n) => n.type === "blob"),
    {
      sourceExtensions: SOURCE_EXTENSIONS,
      skipDirectories: SKIP_DIRECTORIES,
      maxFiles: config.GITHUB_MAX_FILES,
      largeFileLimitBytes,
    },
  );

  const files: FileContent[] = [];
  const errors: GitHubServiceError[] = [];
  const skipped: SkippedSourceFile[] = [...selection.skipped];

  for (let i = 0; i < selection.toFetch.length; i += config.GITHUB_BATCH_SIZE) {
    const batch = selection.toFetch.slice(i, i + config.GITHUB_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((file) => getFileContent(meta, file.path)),
    );

    batchResults.forEach((result) => {
      if (result.status === "rejected") {
        errors.push(
          classifyGitHubError(
            result.reason,
            { repo: canonicalRepoUrl(meta) },
            true,
          ),
        );
        return;
      }

      const file = result.value;

      if (isBinaryContent(file.content)) {
        skipped.push({ path: file.path, reason: "binary", size: file.size });
        return;
      }

      if (
        (typeof file.size === "number" &&
          isOverSizeLimit(file.size, largeFileLimitBytes)) ||
        isOverSizeLimit(Buffer.byteLength(file.content, "utf8"), largeFileLimitBytes)
      ) {
        skipped.push({
          path: file.path,
          reason: "too_large",
          size: file.size ?? Buffer.byteLength(file.content, "utf8"),
        });
        files.push({
          path: file.path,
          content: truncateContent(file.content, largeFileLimitBytes),
          size: file.size,
        });
        return;
      }

      files.push(file);
    });

    if (i + config.GITHUB_BATCH_SIZE < selection.toFetch.length) {
      await sleep(config.GITHUB_RATE_DELAY_MS);
    }
  }

  return { files, errors, skipped };
};

export const githubService = {
  parseRepoUrl,
  canonicalRepoUrl,
  getRepoTree,
  filterDirs,
  detectEntryCandidates,
  getFileContent,
  getSourceFiles,
};

export default githubService;