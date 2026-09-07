/** Deterministic path helpers operating on normalized repo-relative paths. */

export const normalizeRepoPath = (path: string): string =>
  path.split("/").filter(Boolean).join("/");

export const getBasename = (path: string): string => {
  const segments = normalizeRepoPath(path).split("/");
  return segments[segments.length - 1] ?? "";
};

/**
 * All ancestor directories of a file path, nearest-to-root first.
 * `src/utils/helpers.js` → ["src", "src/utils"].
 * Root-level files → [].
 */
export const getParentFolders = (filePath: string): string[] => {
  const segments = normalizeRepoPath(filePath).split("/");
  segments.pop();
  const folders: string[] = [];
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    folders.push(current);
  }
  return folders;
};

/** Lowercased file extension including the dot, or "" when none exists. */
export const getFileExtension = (filePath: string): string => {
  const basename = getBasename(filePath);
  const dotIndex = basename.lastIndexOf(".");
  return dotIndex > 0 ? basename.slice(dotIndex).toLowerCase() : "";
};