import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import morgan from "morgan";
import { scrapGitHub } from "./scraper/github.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

const getGitHubUsername = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("github must be a GitHub username or profile URL");
  }

  const input = value.trim();

  if (!input.includes("/")) {
    return input.replace(/^@/, "");
  }

  const url = new URL(input);

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("github must be a GitHub profile URL");
  }

  const username = url.pathname.split("/").filter(Boolean)[0];

  if (!username) {
    throw new Error("GitHub username not found in URL");
  }

  return username.replace(/^@/, "");
};

app.post("/github", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const github = req.body?.github ?? req.body?.data?.github;
    const username = getGitHubUsername(github);
    const repos = await scrapGitHub(username);

    res.status(200).json({
      username,
      repoCount: repos.length,
      repos,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "URL Fetcher API is running",
    endpoints: {
      github: "POST /github",
    },
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

export default app;
