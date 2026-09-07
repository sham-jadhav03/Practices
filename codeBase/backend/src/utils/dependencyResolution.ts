export interface AliasMapping {
  /** Alias prefix including any trailing slash, e.g. "@/". */
  prefix: string;
  /** Repo-relative directory the alias resolves to, e.g. "src/". */
  replacement: string;
}

/**
 * Known-safe default aliases. `@/` and `~/` can never be npm packages
 * (scoped packages always take the form `@scope/name`), so any import with
 * these prefixes is internal. Specific tsconfig/jsconfig paths are merged on
 * top of these.
 */
export const DEFAULT_PATH_ALIASES: readonly AliasMapping[] = [
  { prefix: "@/", replacement: "" },
  { prefix: "~/", replacement: "" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

/** Parses `compilerOptions.paths` from a tsconfig/jsconfig document. Pure. */
export const extractPathAliasesFromTsConfig = (
  tsconfigText: string,
): AliasMapping[] => {
  if (!tsconfigText || !tsconfigText.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(tsconfigText);
  } catch {
    return [];
  }
  if (!isRecord(parsed)) return [];

  const compilerOptions = parsed["compilerOptions"];
  if (!isRecord(compilerOptions)) return [];

  const paths = compilerOptions["paths"];
  if (!isRecord(paths)) return [];

  const aliases: AliasMapping[] = [];
  for (const [key, rawTargets] of Object.entries(paths)) {
    if (!key.endsWith("/*")) continue;
    const targets = Array.isArray(rawTargets) ? rawTargets : [rawTargets];
    const firstTarget = targets.find(isString);
    if (!firstTarget) continue;
    const replacement = firstTarget
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\*$/, "");
    aliases.push({ prefix: key.slice(0, -1), replacement });
  }
  return aliases;
};

/**
 * Combines default safe aliases with aliases extracted from project config.
 * Explicit project aliases override defaults for the same prefix.
 */
export const getDependencyAliases = (
  projectConfigText?: string | null,
): AliasMapping[] => {
  const extracted = projectConfigText
    ? extractPathAliasesFromTsConfig(projectConfigText)
    : [];
  const merged: AliasMapping[] = [...DEFAULT_PATH_ALIASES];
  for (const alias of extracted) {
    const existing = merged.findIndex((a) => a.prefix === alias.prefix);
    if (existing >= 0) merged[existing] = alias;
    else merged.push(alias);
  }
  return merged;
};

/**
 * Classifies an import specifier as an internal project dependency.
 * Relative and absolute imports are internal; everything else is internal only
 * when it matches a known alias prefix. Unknown aliases are NOT treated as
 * internal (fail safely instead of inventing dependency edges).
 */
export const isInternalImport = (
  specifier: string,
  aliases: readonly AliasMapping[],
): boolean => {
  const cleaned = specifier.trim();
  if (!cleaned) return false;
  if (cleaned.startsWith("./") || cleaned.startsWith("../")) return true;
  if (cleaned.startsWith("/")) return true;
  return aliases.some((alias) => cleaned.startsWith(alias.prefix));
};

export const filterInternalImports = (
  imports: readonly string[],
  aliases: readonly AliasMapping[],
): string[] => Array.from(new Set(imports.filter((i) => isInternalImport(i, aliases))));