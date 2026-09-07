import { Annotation } from "@langchain/langgraph";
import type { ParsedRepo } from "../services/parser.service.js";
import type {
  IDependencyNode,
  IEntryPoint,
  IFolderEntry,
} from "../models/repoAnalysis.model.js";
import type { AnalysisError } from "../types/error.js";
import { CombinedOutput } from "./nodes/combine.node.js";
import {
  AliasMapping,
  DEFAULT_PATH_ALIASES,
} from "../utils/dependencyResolution.js";

export interface IM3Result {
  graph: IDependencyNode[];
  formattedAscii: string;
}

export const GraphState = Annotation.Root({
  parsedRepo: Annotation<ParsedRepo>({
    reducer: (_, next) => next,
    default: () => ({ files: [], sourcePaths: [], errors: [] }),
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

  combined: Annotation<CombinedOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  errors: Annotation<AnalysisError[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  entryCandidates: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  entryContents: Annotation<Array<{ path: string; content: string }>>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  dependencyAliases: Annotation<AliasMapping[]>({
    reducer: (_, next) => next,
    default: () => [...DEFAULT_PATH_ALIASES],
  }),
});

export type GraphStateType = typeof GraphState.State;
