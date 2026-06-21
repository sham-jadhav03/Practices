import dotenv from "dotenv";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables.");
}

export const config = {
  MONGO_URI: process.env.MONGO_URI,
};
