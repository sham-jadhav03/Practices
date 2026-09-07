/**
 * Single source of truth for repository-level constants shared between
 * GitHub ingestion, M2 entry-point detection, and M3 dependency mapping.
 */

export const ENTRY_CANDIDATES = [
  "server.js",
  "server.ts",
  "server.jsx",
  "server.tsx",
  "index.js",
  "index.ts",
  "index.jsx",
  "index.tsx",
  "main.js",
  "main.ts",
  "main.jsx",
  "main.tsx",
  "app.js",
  "app.ts",
  "app.jsx",
  "app.tsx",
  "main.py",
  "app.py",
  "manage.py",
  "wsgi.py",
  "asgi.py",
  "main.go",
  "cmd/main.go",
  "main.rs",
  "Main.java",
] as const;

export type EntryCandidate = (typeof ENTRY_CANDIDATES)[number];

/** Generated/build/vendor/IDE directories never analyzed as source. */
export const SKIP_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".next",
  "out",
  "__pycache__",
  ".vscode",
  ".idea",
  "vendor",
  "target",
  "bin",
  "obj",
  "venv",
  ".venv",
  ".gradle",
  ".mvn",
  "Pods",
  "DerivedData",
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".svelte-kit",
]);

/** Source extensions collected for parsing (parser may treat some as unknown). */
export const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".cs",
  ".kt",
  ".swift",
]);