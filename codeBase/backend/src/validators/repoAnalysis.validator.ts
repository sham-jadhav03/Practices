import { z } from "zod";

const GITHUB_HTTPS_REPO_URL =
  /^https:\/\/(?:www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?\/[A-Za-z0-9_.-]+\/?$/;

export const repoUrlSchema = z
  .string({
    error: (issue) =>
      issue.code === "invalid_type"
        ? "repoUrl must be a string"
        : "repoUrl is required",
  })
  .trim()
  .min(1, "repoUrl must not be empty")
  .max(2048, "repoUrl is too long")
  .regex(
    GITHUB_HTTPS_REPO_URL,
    "repoUrl must be a valid HTTPS GitHub repository URL, e.g. https://github.com/owner/repo",
  );

export type RepoUrlInput = z.infer<typeof repoUrlSchema>;