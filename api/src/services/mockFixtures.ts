import type { FinalApprovalStatus } from "../types";

export interface MockFixtureRow {
  locationScore: number;
  assignedState: string | null;
  semanticScore: number;
  gatewayRelevant: boolean;
  finalApproval: FinalApprovalStatus;
}

export const MOCK_STAGE_RESULTS: MockFixtureRow[] = [
  { locationScore: 0.88, assignedState: "TX", semanticScore: 0.91, gatewayRelevant: true, finalApproval: "approved" },
  { locationScore: 0.42, assignedState: null, semanticScore: 0.33, gatewayRelevant: false, finalApproval: "rejected" },
  { locationScore: 0.74, assignedState: "CA", semanticScore: 0.65, gatewayRelevant: true, finalApproval: "needs_review" },
  { locationScore: 0.95, assignedState: "FL", semanticScore: 0.88, gatewayRelevant: true, finalApproval: "approved" },
  { locationScore: 0.55, assignedState: null, semanticScore: 0.48, gatewayRelevant: true, finalApproval: "rejected" }
];

export function getMockFixture(articleIndex: number): MockFixtureRow {
  return MOCK_STAGE_RESULTS[articleIndex % MOCK_STAGE_RESULTS.length];
}

function readMs(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getMockDelay(): number {
  const min = readMs("MOCK_STAGE_DELAY_MS_MIN", readMs("MOCK_STAGE_DELAY_MS", 0));
  const max = readMs("MOCK_STAGE_DELAY_MS_MAX", readMs("MOCK_STAGE_DELAY_MS", 0));
  const high = Math.max(min, max);
  const low = Math.min(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

export async function waitForMockDelay(): Promise<void> {
  const delay = getMockDelay();
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
