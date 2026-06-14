import { existsSync, readFileSync } from "node:fs";
import { QueryTypes, Sequelize } from "sequelize";

import { DefaultPrompt, sequelize as liteSequelize } from "../src/models";
import type { DefaultPromptKey } from "../src/models";

function loadSeedEnv(): void {
  if (!existsSync(".env.seed")) {
    return;
  }
  for (const line of readFileSync(".env.seed", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    process.env[key] ??= valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

loadSeedEnv();

type SourcePromptRow = {
  prompt_key?: string | null;
  prompt_in_markdown?: string | null;
  promptInMarkdown?: string | null;
  id?: number;
};

const fallbackPrompts: Record<DefaultPromptKey, string> = {
  approver_gateway:
    "Decide whether this article is relevant to United States public safety hazards. Return relevance, confidence, and reasoning.",
  approver_chemical:
    "Score whether this article describes a chemical hazard, spill, exposure, or contamination incident.",
  approver_wildfire:
    "Score whether this article describes a wildfire, smoke, evacuation, or related wildfire hazard.",
  approver_severe_weather:
    "Score whether this article describes severe weather creating safety risk.",
  state_assigner:
    "Assign the most likely US state for the incident. Return a state abbreviation or null with confidence and reasoning."
};

const promptKeyQueries: Record<DefaultPromptKey, string> = {
  approver_gateway: `
    SELECT "promptInMarkdown", id
    FROM "AiApproverPromptVersions"
    WHERE "isActive" = true
      AND ("promptRole" = 'gatekeeper' OR "promptKey" = 'approver_gateway')
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `,
  approver_chemical: `
    SELECT "promptInMarkdown", id
    FROM "AiApproverPromptVersions"
    WHERE "isActive" = true
      AND ("promptKey" IN ('chemical', 'approver_chemical') OR name ILIKE '%chemical%')
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `,
  approver_wildfire: `
    SELECT "promptInMarkdown", id
    FROM "AiApproverPromptVersions"
    WHERE "isActive" = true
      AND ("promptKey" IN ('wildfire', 'approver_wildfire') OR name ILIKE '%wildfire%')
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `,
  approver_severe_weather: `
    SELECT "promptInMarkdown", id
    FROM "AiApproverPromptVersions"
    WHERE "isActive" = true
      AND ("promptKey" IN ('severe_weather', 'approver_severe_weather') OR name ILIKE '%weather%')
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `,
  state_assigner: `
    SELECT "promptInMarkdown", id
    FROM "Prompts"
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `
};

async function main(): Promise<void> {
  const sourceUrl = process.env.NEWSNEXUS12_DATABASE_URL;
  if (!sourceUrl) {
    throw new Error("NEWSNEXUS12_DATABASE_URL is required in api/.env.seed");
  }

  const source = new Sequelize(sourceUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { application_name: "newsnexus12lite_seed_readonly" }
  });

  let copied = 0;
  let authored = 0;

  try {
    await source.authenticate();
    await liteSequelize.authenticate();
    await liteSequelize.sync({ alter: true });

    for (const [promptKey, query] of Object.entries(promptKeyQueries) as Array<[DefaultPromptKey, string]>) {
      const rows = await source.query<SourcePromptRow>(query, { type: QueryTypes.SELECT });
      const promptText = rows[0]?.promptInMarkdown ?? rows[0]?.prompt_in_markdown ?? fallbackPrompts[promptKey];
      const sourceType = rows[0] ? "copied" : "authored";
      if (sourceType === "copied") {
        copied += 1;
      } else {
        authored += 1;
      }

      await DefaultPrompt.upsert({
        promptKey,
        promptText,
        supportingDetails: { sourcePromptId: rows[0]?.id ?? null },
        source: sourceType,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`seed complete: copied=${copied} authored=${authored}`);
  } finally {
    await source.close();
    await liteSequelize.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
