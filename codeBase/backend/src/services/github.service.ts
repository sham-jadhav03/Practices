import { response } from "express";
import { config } from "../config/config.js";
import axios from "axios";

/**
 * Interfaces
 */

export interface RepoInfo {
  owner: string;
  repo: string;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitTreeResponse {
  owner: string;
  repo: string;
  branch: string;
  tree: GitTreeItem[];
}

export interface GitHubRepoMetadata {
  default_branch: string;
}

export interface GitHubContentResponse {
  type: "file" | "dir";
  content: string;
}

export interface FileResult {
  filePath: string;
  content: string | null;
  success: boolean;
}

/**
 * Extract owner and repo name from a GitHub URL
 */

export const parseRepoUrl = (repoUrl: string): RepoInfo => {
  if (!repoUrl) {
    throw new Error("Repository Url is required");
  }

  const cleanUrl = repoUrl
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const parts = cleanUrl.split("/");

  const repo = parts.pop();
  const owner = parts.pop();

  if (!owner || repo) {
    throw new Error("Invalid GitHub repository URL format");
  }

  return { owner, repo };
};

/**GitHub request header */

const getHeader = (): Record<string, string> => {
  const headers = (Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  });

  if (config.GITHUB_TOKEN) {
    headers.Authorization = `Beare ${config.GITHUB_TOKEN}`;
  }

  return headers;
};

/**
 * Get repository default branch
 */

const getDefaultBranch = async (
  owner: string,
  repo: string,
): Promise<string> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;

    const reponse = await axios.get<GitHubRepoMetadata>(url, {
      headers: getHeader(),
    });

    return reponse.data.default_branch ?? "main";
  } catch (error) {
    console.error(error);
  }

  return "main";
};

/**
 * Fetch repo tree
 */

export const getTree = async (repoUrl: string): Promise<GitTreeResponse> => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const branch = await getDefaultBranch(owner, repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const reponse = await axios.get<{ tree: GitTreeItem[] }>(url, {
    headers: getHeader(),
  });

  const ignorePatterns = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "coverage/",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".ico",
    ".pdf",
    ".zip",
  ];

  const filteredTree = response.data.tree.filter(
    (item: GitTreeItem) => 
        !ignorePatterns.some((pattern)=> item.path.includes(pattern))
  );

  return {
    owner,
    repo,
    branch,
    tree: filteredTree,
  };
};

/**
 * Fetch a single file
 */

export const getfile = async (
    repoUrl: string,
    filePath: string
): Promise<string> => {
    const {owner, repo} = parseRepoUrl(repoUrl);
    
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const response = await axios.get<GitHubContentResponse>(url, {
        headers: getHeader(),
    })

    if(response.data.type !== "file") {
        throw new Error(`Path '${filePath} is a directory, not a file.'`);
    }

    return Buffer.from(response.data.content, "base64").toString("utf8");
}

/**
 * Fetch multiple files
 */

export const getMultipleFiles = 
