import { DefaultPrompt, type DefaultPromptKey } from "../models";
import type { PromptConfiguration } from "../types";

const AUTHORED_DEFAULTS: Record<DefaultPromptKey, { text: string; details?: unknown }> = {
  approver_gateway: {
    text: "Decide whether the article is relevant to public safety hazards in the United States. Return relevance, confidence, and concise reasoning."
  },
  approver_chemical: {
    text: "Evaluate whether the article describes a chemical hazard, spill, exposure, or contamination event. Return a 0-1 score and reasoning."
  },
  approver_wildfire: {
    text: "Evaluate whether the article describes a wildfire, smoke, evacuation, burn risk, or related wildfire hazard. Return a 0-1 score and reasoning."
  },
  approver_severe_weather: {
    text: "Evaluate whether the article describes severe weather that creates safety risk. Return a 0-1 score and reasoning."
  },
  state_assigner: {
    text: "Assign the most likely US state for the incident described in the article. Return a two-letter state abbreviation when confident, or null.",
    details: {
      promptId: "authored-lite-state-assigner",
      outputRules: "Return a US state abbreviation or null with confidence and reasoning.",
      version: "lite-authored-v1"
    }
  }
};

let cachedPrompts: PromptConfiguration | null = null;

function assemblePromptConfiguration(rows: Partial<Record<DefaultPromptKey, { promptText: string; supportingDetails?: unknown }>>): PromptConfiguration {
  return {
    approver: {
      gatewayPrompt: rows.approver_gateway?.promptText ?? AUTHORED_DEFAULTS.approver_gateway.text,
      hazardPrompts: {
        chemical: rows.approver_chemical?.promptText ?? AUTHORED_DEFAULTS.approver_chemical.text,
        wildfire: rows.approver_wildfire?.promptText ?? AUTHORED_DEFAULTS.approver_wildfire.text,
        severeWeather:
          rows.approver_severe_weather?.promptText ??
          AUTHORED_DEFAULTS.approver_severe_weather.text
      }
    },
    stateAssigner: {
      assignmentPrompt: rows.state_assigner?.promptText ?? AUTHORED_DEFAULTS.state_assigner.text,
      supportingDetails:
        rows.state_assigner?.supportingDetails ?? AUTHORED_DEFAULTS.state_assigner.details
    },
    updatedAt: new Date().toISOString()
  };
}

export function clonePromptConfiguration(prompts: PromptConfiguration): PromptConfiguration {
  return JSON.parse(JSON.stringify(prompts)) as PromptConfiguration;
}

export async function loadDefaultPrompts(): Promise<PromptConfiguration> {
  if (cachedPrompts) {
    return clonePromptConfiguration(cachedPrompts);
  }

  try {
    const rows = await DefaultPrompt.findAll();
    const keyedRows: Partial<Record<DefaultPromptKey, { promptText: string; supportingDetails?: unknown }>> = {};

    for (const row of rows) {
      keyedRows[row.promptKey] = {
        promptText: row.promptText,
        supportingDetails: row.supportingDetails ?? undefined
      };
    }

    cachedPrompts = assemblePromptConfiguration(keyedRows);
  } catch {
    cachedPrompts = assemblePromptConfiguration({});
  }

  return clonePromptConfiguration(cachedPrompts);
}

export function getDefaultPrompts(): PromptConfiguration {
  if (!cachedPrompts) {
    cachedPrompts = assemblePromptConfiguration({});
  }

  return clonePromptConfiguration(cachedPrompts);
}

export function clearDefaultPromptCache(): void {
  cachedPrompts = null;
}

export function promptGroupIsDefault(
  prompts: PromptConfiguration,
  defaults: PromptConfiguration,
  group: "approver" | "stateAssigner"
): boolean {
  return JSON.stringify(prompts[group]) === JSON.stringify(defaults[group]);
}
