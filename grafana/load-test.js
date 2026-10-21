import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const availabilityFaitures = new Rate("availability_failures");

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    availability_failures: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

const base_url = "http://localhost:4000";
const health_path = "/health";

export default function () {
  const response = http.get(`${base_url}${health_path}`, {
    timeout: "10s",
    tags: { endpoint: "health" },
  });

  const ok = check(response, {
    "returns HTTP 200": (r) => r.status === 200,
    "response is JSON": (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
    "status is ok": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  availabilityFaitures.add(!ok);

  sleep(1);
}
