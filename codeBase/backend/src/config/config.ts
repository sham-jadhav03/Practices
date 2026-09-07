import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

if (!process.env.PORT) {
  process.env.PORT = isProd ? "4000" : "3000";
}

if (!process.env.MONGO_URI) {
  if (isProd) {
    throw new Error("CRITICAL: MONGO_URI is not defined in environment variables (production mode)");
  }
  console.warn("WARNING: MONGO_URI not set - using in-memory fallback");
}

if (!process.env.GITHUB_TOKEN) {
  if (isProd) {
    throw new Error("CRITICAL: GITHUB_TOKEN is not defined in environment variables (production mode)");
  }
  console.warn("WARNING: GITHUB_TOKEN not set - GitHub analysis will be disabled");
}

if (!process.env.GROQ_API_KEY) {
  if (isProd) {
    throw new Error("CRITICAL: GROQ_API_KEY is not defined in environment variables (production mode)");
  }
  console.warn("WARNING: GROQ_API_KEY not set - AI analysis will be disabled");
}

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  PORT: process.env.PORT!,
  MONGO_URI: process.env.MONGO_URI,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  ANALYSIS_TIMEOUT_MS: parsePositiveInt(
    process.env.ANALYSIS_TIMEOUT_MS,
    180000,
  ),
  DB_CONNECT_RETRIES: parsePositiveInt(process.env.DB_CONNECT_RETRIES, 3),
  GITHUB_MAX_FILES: parsePositiveInt(process.env.GITHUB_MAX_FILES, 60),
  GITHUB_BATCH_SIZE: parsePositiveInt(process.env.GITHUB_BATCH_SIZE, 5),
  GITHUB_RATE_DELAY_MS: parsePositiveInt(process.env.GITHUB_RATE_DELAY_MS, 100),
  GITHUB_LARGE_FILE_LIMIT_KB: parsePositiveInt(
    process.env.GITHUB_LARGE_FILE_LIMIT_KB,
    256,
  ),
  M3_MAX_FILES_FOR_LLM: parsePositiveInt(
    process.env.M3_MAX_FILES_FOR_LLM,
    40,
  ),
  M2_MAX_ENTRY_CONTENTS: parsePositiveInt(
    process.env.M2_MAX_ENTRY_CONTENTS,
    3,
  ),
};