import app from "./src/app.js";
import { config } from "./src/config/config.js";
import connectDB from "./src/config/db.js";

const PORT = Number(config.PORT) || 4000;

process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception:", err);
  process.exit(1);
});

const start = async (): Promise<void> => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      console.error("[Server] Failed to start HTTP server:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error(
      "[Server] Fatal startup error - MongoDB unavailable:",
      err instanceof Error ? err.message : err,
    );
    console.error("[Server] Exiting. Start MongoDB and retry.");
    process.exit(1);
  }
};

void start();