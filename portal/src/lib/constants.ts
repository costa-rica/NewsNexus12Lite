import type { StageName } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010";
export const SNAPSHOT_INTERVAL_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS ?? "5000",
  10
);

export const STAGES: Array<{ key: StageName; label: string }> = [
  { key: "scraping", label: "Scraping" },
  { key: "locationScorer", label: "Location Scorer" },
  { key: "stateAssigner", label: "State Assigner" },
  { key: "semanticScorer", label: "Semantic Scorer" },
  { key: "aiApprover", label: "AI Approver" }
];
