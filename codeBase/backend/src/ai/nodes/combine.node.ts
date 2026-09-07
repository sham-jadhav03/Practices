import { IAnalysisResult } from "../../models/repoAnalysis.model.js";
import { GraphStateType } from "../state.js";
import {
  AnalysisError,
  AnalysisStatus,
  analysisError,
} from "../../types/error.js";

export interface CombinedOutput {
  result: IAnalysisResult | null;
  errors: AnalysisError[];
  status: AnalysisStatus;
}

export const combineNode = (
  state: GraphStateType,
): Partial<GraphStateType> & { combined: CombinedOutput } => {
  const { m1Result, m2Result, m3Result, errors } = state;

  const mergedErrors = [...errors];

  // Explicit semantics: null means the node is unavailable/failed; empty
  // results mean the node ran successfully but found no relevant data.
  if (m1Result === null) {
    mergedErrors.push(
      analysisError(
        "COMBINE",
        "M1_RESULT_MISSING",
        "M1 folder analysis result is missing.",
        false,
      ),
    );
  }
  if (m2Result === null) {
    mergedErrors.push(
      analysisError(
        "COMBINE",
        "M2_RESULT_MISSING",
        "M2 entry point analysis result is missing.",
        false,
      ),
    );
  }
  if (m3Result === null) {
    mergedErrors.push(
      analysisError(
        "COMBINE",
        "M3_RESULT_MISSING",
        "M3 dependency analysis result is missing.",
        false,
      ),
    );
  }

  const result: IAnalysisResult = {
    m1: m1Result ?? [],
    m2: m2Result ?? { file: "", executionFlow: [], description: "" },
    m3: {
      graph: m3Result?.graph ?? [],
      formattedAscii: m3Result?.formattedAscii ?? "",
    },
  };

  const status: AnalysisStatus =
    mergedErrors.length > 0 ? "partial" : "completed";

  return {
    combined: {
      result,
      errors: mergedErrors,
      status,
    },
  };
};