import { DefaultPrompt } from "../DefaultPrompt";

const validPrompt = {
  promptKey: "approver_gateway",
  promptText: "Approve relevant hazardous material articles.",
  supportingDetails: null,
  source: "authored",
  createdAt: new Date("2026-06-14T00:00:00.000Z"),
  updatedAt: new Date("2026-06-14T00:00:00.000Z")
} as const;

describe("DefaultPrompt", () => {
  it("accepts valid promptKey and source values", async () => {
    const prompt = DefaultPrompt.build(validPrompt);

    await expect(prompt.validate()).resolves.toBe(prompt);
  });

  it("rejects promptKey values outside the valid set", async () => {
    const prompt = DefaultPrompt.build({
      ...validPrompt,
      promptKey: "invalid_prompt_key" as never
    });

    await expect(prompt.validate()).rejects.toThrow();
  });

  it("rejects source values other than copied and authored", async () => {
    const prompt = DefaultPrompt.build({
      ...validPrompt,
      source: "generated" as never
    });

    await expect(prompt.validate()).rejects.toThrow();
  });
});
