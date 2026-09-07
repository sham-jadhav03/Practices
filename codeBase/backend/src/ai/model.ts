import { config } from "../config/config.js";
import { ChatGroq } from "@langchain/groq";

const MODEL_NAME = "llama-3.3-70b-versatile";

let m1Model: ChatGroq | null = null;
let m2Model: ChatGroq | null = null;
let m3Model: ChatGroq | null = null;

const createModel = (): ChatGroq => {
  const apiKey = config.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured - AI analysis is unavailable");
  }
  return new ChatGroq({
    model: MODEL_NAME,
    temperature: 0,
    apiKey,
  });
};

export const getM1Model = (): ChatGroq => (m1Model ??= createModel());

export const getM2Model = (): ChatGroq => (m2Model ??= createModel());

export const getM3Model = (): ChatGroq => (m3Model ??= createModel());