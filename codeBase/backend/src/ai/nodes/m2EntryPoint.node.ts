import { getM2Model } from "../model.js";
import {
  buildM2UserPrompt,
  M2_System_Prompt,
  M2Outputschema,
} from "../prompts/m2Prompt.js";
import { GraphStateType } from "../state.js";
import { isEntryCandidate } from "../../utils/entryCandidates.js";
import { ParsedFile } from "../../services/parser.service.js";
import { config } from "../../config/config.js";
import {
  analysisError,
  errorToAnalysisError,
} from "../../types/error.js";

/**
 * Meaningful structured fallback from parsed metadata when raw file content
 * is unavailable. Explicitly labeled as metadata - function names are real
 * symbols, but are never passed off as source code.
 */
export const buildFallbackEntryContent = (
  parsed: ParsedFile,
): string =>
  [
    "[Metadata only - source content was not fetched]",
    `path: ${parsed.filePath}`,
    `language: ${parsed.language}`,
    `lines: ${parsed.lineCount}`,
    parsed.imports.length
      ? `imports: ${parsed.imports.join(", ")}`
      : "imports: (none)",
    parsed.exports.length
      ? `exports: ${parsed.exports.join(", ")}`
      : "exports: (none)",
    parsed.functions.length
      ? `functions: ${parsed.functions.join(", ")}`
      : "functions: (none)",
  ].join("\n");

export const m2EntryPointNode = async (
  state: GraphStateType,
): Promise<Partial<GraphStateType>> => {
  try {
    const { files, sourcePaths } = state.parsedRepo;

    const candidates = state.entryCandidates?.length
      ? state.entryCandidates
      : sourcePaths.filter((p) => isEntryCandidate(p));

    if (!candidates.length) {
      return {
        m2Result: {
          file: "unknown",
          executionFlow: [],
          description: "No entry detected.",
        },
        errors: [
          analysisError(
            "M2",
            "NO_ENTRY_CANDIDATES",
            "No entry point candidates were detected.",
            false,
          ),
        ],
      };
    }

    let entryContents = state.entryContents?.length
      ? state.entryContents
      : [];

    if (!entryContents.length) {
      entryContents = candidates
        .slice(0, config.M2_MAX_ENTRY_CONTENTS)
        .flatMap((path) => {
          const parsedFile = files.find((f) => f.filePath === path);
          return parsedFile
            ? [{ path, content: buildFallbackEntryContent(parsedFile) }]
            : [];
        });
    }

    const m2LLM = getM2Model().withStructuredOutput(M2Outputschema);

    const result = await m2LLM.invoke([
      {
        role: "system",
        content: M2_System_Prompt,
      },
      {
        role: "user",
        content: buildM2UserPrompt(candidates, entryContents),
      },
    ]);

    return {
      m2Result: result,
    };
  } catch (err) {
    console.error(
      "[M2] Entry point analysis failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      m2Result: { file: "unknown", executionFlow: [], description: "" },
      errors: [
        errorToAnalysisError(
          err,
          "M2",
          "ENTRY_POINT_ANALYSIS_FAILED",
          "Entry point analysis failed.",
          true,
        ),
      ],
    };
  }
};