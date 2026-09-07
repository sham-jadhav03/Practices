import { ENTRY_CANDIDATES } from "../config/repo.constants.js";
import { getBasename, normalizeRepoPath } from "./repoPaths.js";

/** Maximum depth at which a basename alone is treated as an entry candidate. */
const MAX_BASENAME_DEPTH = 2;

/**
 * Normalized path matching for entry candidates. Exact path matches always
 * qualify (covers `cmd/main.go`). Root-level and one-level-nested basename
 * matches qualify as well (covers `manage.py`, `main.rs`, `mysite/wsgi.py`).
 * Substring matching is never used, so `docs/main.rs.example` is NOT an entry.
 */
export const isEntryCandidate = (
  path: string,
  candidates: readonly string[] = ENTRY_CANDIDATES,
): boolean => {
  const normalized = normalizeRepoPath(path);
  if (!normalized) return false;
  if (candidates.includes(normalized)) return true;
  const segments = normalized.split("/");
  if (
    segments.length <= MAX_BASENAME_DEPTH &&
    candidates.includes(getBasename(normalized))
  ) {
    return true;
  }
  return false;
};

export const filterEntryCandidates = (
  paths: readonly string[],
  candidates: readonly string[] = ENTRY_CANDIDATES,
): string[] => {
  const matches = paths.filter((p) => isEntryCandidate(p, candidates));
  return [...new Set(matches)].sort(
    (a, b) =>
      a.split("/").length - b.split("/").length || a.localeCompare(b),
  );
};