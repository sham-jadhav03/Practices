import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import analysisRouter from "./routes/repoAnalysis.route.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors());

app.get("/", async (_req: Request, res: Response) => {
  res.send("Hello from server");
});

app.use("/api/analysis", analysisRouter);

// Centralized error handler: never crash the process on unhandled route errors.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(
    "[App] Unexpected error:",
    err instanceof Error ? err.message : err,
  );
  if (res.headersSent) return;
  res
    .status(500)
    .json({ success: false, message: "Unexpected server error." });
});

export default app;