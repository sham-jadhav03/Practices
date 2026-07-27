import axios from "axios";

export type GitHubRepo = {
  description: string | null;
  name: string;
  fullName: string;
  starCount: number;
  url: string;
};

type GitHubApiRepo = {
  description: string | null;
  name: string;
  full_name: string;
  stargazers_count: number;
  html_url: string;
};

export const scrapGitHub = async (username: string): Promise<GitHubRepo[]> => {
  const token = process.env.GITHUB_TOKEN;

  const response = await axios.get<GitHubApiRepo[]>(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "url-fetcher",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      params: {
        per_page: 100,
        sort: "updated",
      },
    },
  );

  return response.data.map((repo) => ({
    description: repo.description,
    name: repo.name,
    fullName: repo.full_name,
    starCount: repo.stargazers_count,
    url: repo.html_url,
  }));
};
