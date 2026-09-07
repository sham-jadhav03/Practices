import { getM3Model } from "../model.js";
import { GraphStateType } from "../state.js";
import {
  M3OutputSchema,
  M3_SYSTEM_PROMPT,
  buildM3UserPrompt,
} from "../prompts/m3Prompt.js";
import { config } from "../../config/config.js";
import {
  filterInternalImports,
} from "../../utils/dependencyResolution.js";
import {
  analysisError,
  errorToAnalysisError,
} from "../../types/error.js";

export const m3DependencyNode = async (
  state: GraphStateType,
): Promise<Partial<GraphStateType>> => {
  try {
    const { files } = state.parsedRepo;

    if (!files.length) {
      return {
        m3Result: { graph: [], formattedAscii: "" },
        errors: [
          analysisError(
            "M3",
            "NO_FILES_TO_MAP",
            "No files available to map dependencies.",
            false,
          ),
        ],
      };
    }

    const maxFiles = config.M3_MAX_FILES_FOR_LLM;
    const aliases = state.dependencyAliases?.length
      ? state.dependencyAliases
      : [];

    // Internal dependencies: relative/absolute imports plus imports matching a
    // known alias (e.g. `@/utils`). External packages are deliberately filtered
    // out - unknown aliases fail safe instead of inventing dependency edges.
    const dependencyData = files.slice(0, maxFiles).map((f) => ({
      filePath: f.filePath,
      imports: filterInternalImports(f.imports, aliases),
    }));

    const m3LLM = getM3Model().withStructuredOutput(M3OutputSchema);

    const result = await m3LLM.invoke([
      { role: "system", content: M3_SYSTEM_PROMPT },
      { role: "user", content: buildM3UserPrompt(dependencyData) },
    ]);

    return {
      m3Result: result,
    };
  } catch (err) {
    console.error(
      "[M3] Dependency mapping failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      m3Result: { graph: [], formattedAscii: "" },
      errors: [
        errorToAnalysisError(
          err,
          "M3",
          "DEPENDENCY_ANALYSIS_FAILED",
          "Dependency mapping failed.",
          true,
        ),
      ],
    };
  }
};