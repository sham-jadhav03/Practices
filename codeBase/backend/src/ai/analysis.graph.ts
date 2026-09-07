import { END, START, StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { M1FolderNode } from "./nodes/m1Folder.node.js";
import { m2EntryPointNode } from "./nodes/m2EntryPoint.node.js";
import { m3DependencyNode } from "./nodes/m3Dependency.node.js";
import { CombinedOutput, combineNode } from "./nodes/combine.node.js";
import { ParsedRepo } from "../services/parser.service.js";
import { IAnalysisResult } from "../models/repoAnalysis.model.js";
import { AliasMapping } from "../utils/dependencyResolution.js";
import {
  AnalysisError,
  AnalysisStatus,
  analysisError,
  errorToAnalysisError,
} from "../types/error.js";

const workFlow = new StateGraph(GraphState)
  /** parallel nodes */
  .addNode("m1", M1FolderNode)
  .addNode("m2", m2EntryPointNode)
  .addNode("m3", m3DependencyNode)
  .addNode("combine", combineNode)

  /**Start  */
  .addEdge(START, "m1")
  .addEdge(START, "m2")
  .addEdge(START, "m3")

  /**all 3 must complete before combine runs */

  .addEdge("m1", "combine")
  .addEdge("m2", "combine")
  .addEdge("m3", "combine")

  .addEdge("combine", END);

/** Compiled graph */
export const analysisGraph = workFlow.compile();

export interface GraphRunResult {
  result: IAnalysisResult | null;
  errors: AnalysisError[];
  status: AnalysisStatus;
}

export interface GraphInput {
  parsedRepo: ParsedRepo;
  entryCandidates?: string[];
  entryContents?: Array<{ path: string; content: string }>;
  dependencyAliases?: AliasMapping[];
}

export const runAnalysisGraph = async (
  input: GraphInput,
): Promise<GraphRunResult> => {
  try {
    // Optional state fields rely on their Annotation defaults; only required
    // analysis inputs are passed explicitly. `errors: []` guarantees a fresh
    // error state per run, so earlier runs can never bleed stale errors in
    // while M1/M2/M3 still append independently during the same run.
    const finalState = await analysisGraph.invoke({
      parsedRepo: input.parsedRepo,
      ...(input.entryCandidates?.length
        ? { entryCandidates: input.entryCandidates }
        : {}),
      ...(input.entryContents?.length ? { entryContents: input.entryContents } : {}),
      ...(input.dependencyAliases?.length
        ? { dependencyAliases: input.dependencyAliases }
        : {}),
      errors: [],
    });

    const combined: CombinedOutput | null = finalState.combined;

    if (!combined) {
      return {
        result: null,
        errors: [
          analysisError(
            "COMBINE",
            "COMBINE_NODE_NO_OUTPUT",
            "Combine node did not produce an output.",
            false,
          ),
        ],
        status: "failed",
      };
    }

    return {
      result: combined.result,
      errors: combined.errors,
      status: combined.status,
    };
  } catch (err) {
    console.error(
      "[Graph] Fatal error:",
      err instanceof Error ? err.message : err,
    );
    return {
      result: null,
      errors: [
        errorToAnalysisError(
          err,
          "COMBINE",
          "GRAPH_FATAL",
          "The analysis graph failed unexpectedly.",
          false,
        ),
      ],
      status: "failed",
    };
  }
};