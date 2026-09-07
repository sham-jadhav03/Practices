import { getM1Model } from "../model.js";
import {
  buildM1UserPrompt,
  M1_System_Prompt,
  M1OutputSchema,
} from "../prompts/m1Prompt.js";
import { GraphStateType } from "../state.js";
import { getParentFolders } from "../../utils/repoPaths.js";
import {
  errorToAnalysisError,
} from "../../types/error.js";

export const M1FolderNode = async (
  state: GraphStateType,
): Promise<Partial<GraphStateType>> => {
  try {
    const { sourcePaths } = state.parsedRepo;

    // Derive every ancestor directory of every source file, preserving the
    // full nested hierarchy (src/utils/helpers.js -> src, src/utils).
    const folderPaths = [
      ...new Set(sourcePaths.flatMap((p) => getParentFolders(p))),
    ].sort();

    // Explicit empty state: no directories means the repository is entirely
    // root-level (or has no source directories). This is a valid M1 result,
    // not a failure - no folders are fabricated and combine is unaffected.
    if (!folderPaths.length) {
      return {
        m1Result: [],
        errors: [],
      };
    }

    const m1LLM = getM1Model().withStructuredOutput(M1OutputSchema);

    const result = await m1LLM.invoke([
      { role: "system", content: M1_System_Prompt },
      {
        role: "user",
        content: buildM1UserPrompt(folderPaths, sourcePaths),
      },
    ]);

    return {
      m1Result: result.folders,
    };
  } catch (err) {
    console.error(
      "[M1] Folder analysis failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      m1Result: [],
      errors: [
        errorToAnalysisError(
          err,
          "M1",
          "FOLDER_ANALYSIS_FAILED",
          "Folder structure analysis failed.",
          true,
        ),
      ],
    };
  }
};