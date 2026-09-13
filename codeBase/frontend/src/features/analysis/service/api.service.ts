import axios from "axios";

const API_URL = "http://localhost:4000";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export async function analysisAPI(
  repoUrl: string,
): Promise<{ repoUrl: string }> {
  const response = await api.post<{ repoUrl: string }>("/api/analysis", {
    repoUrl,
  });

  return response.data;
}
