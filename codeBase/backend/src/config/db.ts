import mongoose from "mongoose";
import { config } from "./config.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (): Promise<void> => {
  const maxRetries = config.DB_CONNECT_RETRIES;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(config.MONGO_URI!, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log("Connected Database");
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `[DB] MongoDB connection attempt ${attempt}/${maxRetries} failed:`,
        error instanceof Error ? error.message : error,
      );
      if (attempt < maxRetries) {
        await sleep(2000 * attempt);
      }
    }
  }

  throw lastError;
};

export default connectDB;