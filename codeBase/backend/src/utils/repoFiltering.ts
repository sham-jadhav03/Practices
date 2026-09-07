import {
  SKIP_DIRECTORIES,
  SOURCE_EXTENSIONS,
} from "../config/repo.constants.js";
import { getFileExtension } from "./repoPaths.js";

/**
 * Path-segment-aware skip matching: a directory is only skipped when an actual
 * path segment matches a configured skipped directory. `my-node_modules/file.js`
 * is therefore NOT skipped (segment is `my-node_modules`, not `node_modules`).
 */
export const isSkippedPath = (
  path: string,
  skipDirectories: ReadonlySet<string> = SKIP_DIRECTORIES,
): boolean =>
  path
    .split("/")
    .some((segment) => segment !== "" && skipDirectories.has(segment));

export const isSourceFile = (
  path: string,
  sourceExtensions: ReadonlySet<string> = SOURCE_EXTENSIONS,
): boolean => sourceExtensions.has(getFileExtension(path));

export const isBinaryContent = (content: string): boolean =>
  content.includes("\u0000");

export const isOverSizeLimit = (bytes: number, limitBytes: number): boolean =>
  bytes > limitBytes;

export const contentByteLength = (content: string): number =>
  Buffer.byteLength(content, "utf8");

export const truncateContent = (
  content: string,
  limitBytes: number,
): string => {
  if (contentByteLength(content) <= limitBytes) return content;
  let slice = content.slice(0, limitBytes);
  while (contentByteLength(slice) > limitBytes) {
    slice = slice.slice(0, Math.floor(slice.length - limitBytes * 0.05));
  }
  return slice;
};

export interface SourceSelectionNode {
  path: string;
  size?: number;
}

export type SourceSkipReason = "too_large" | "binary";

export interface SkippedSourceFile {
  path: string;
  reason: SourceSkipReason;
  size?: number;
}

export interface SourceSelection {
  toFetch: SourceSelectionNode[];
  skipped: SkippedSourceFile[];
}

/** Pure planner: decides which source files to fetch without touching the network. */
export const planSourceSelection = (
  nodes: readonly SourceSelectionNode[],
  options: {
    sourceExtensions?: ReadonlySet<string>;
    skipDirectories?: ReadonlySet<string>;
    maxFiles: number;
    largeFileLimitBytes: number;
  },
): SourceSelection => {
  const {
    sourceExtensions = SOURCE_EXTENSIONS,
    skipDirectories = SKIP_DIRECTORIES,
    maxFiles,
    largeFileLimitBytes,
  } = options;

  const skipped: SkippedSourceFile[] = [];
  const candidates: SourceSelectionNode[] = [];

  for (const node of nodes) {
    if (isSkippedPath(node.path, skipDirectories)) continue;
    if (!isSourceFile(node.path, sourceExtensions)) continue;
    if (
      typeof node.size === "number" &&
      isOverSizeLimit(node.size, largeFileLimitBytes)
    ) {
      skipped.push({ path: node.path, reason: "too_large", size: node.size });
      continue;
    }
    candidates.push(node);
  }

  return { toFetch: candidates.slice(0, maxFiles), skipped };
};