import { Annotation } from "@langchain/langgraph";
import type { ParsedRepo } from "../services/parser.service.js";
import type {
  IDependencyNode,
  IEntryPoint,
  IFolderEntry,
} from "../models/repoAnalysis.model.js";

export interface IM3Result {
  graph: IDependencyNode[];
  formattedAscii: string;
}

export const GraphState = Annotation.Root({
  parsedRepo: Annotation<ParsedRepo>({
    reducer: (_, next) => next,
    default: () => ({ files: [], sourcePaths: [] }),
  }),

  m1Result: Annotation<IFolderEntry[] | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  m2Result: Annotation<IEntryPoint | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  m3Result: Annotation<IM3Result | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  errors: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type GraphStateType = typeof GraphState.State;
