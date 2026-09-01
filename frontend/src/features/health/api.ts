import { api } from "@/shared/api/client";

export type HealthStatus = {
  status: string;
  service: string;
  timestamp: string;
};

export function fetchHealth() {
  return api.get<HealthStatus>("/v1/health");
}
