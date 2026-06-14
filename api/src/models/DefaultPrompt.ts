import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes
} from "sequelize";

import { sequelize } from "./sequelize";

export const DEFAULT_PROMPT_KEYS = [
  "approver_gateway",
  "approver_chemical",
  "approver_wildfire",
  "approver_severe_weather",
  "state_assigner"
] as const;

export type DefaultPromptKey = (typeof DEFAULT_PROMPT_KEYS)[number];

export const DEFAULT_PROMPT_SOURCES = ["copied", "authored"] as const;

export type DefaultPromptSource = (typeof DEFAULT_PROMPT_SOURCES)[number];

export class DefaultPrompt extends Model<
  InferAttributes<DefaultPrompt>,
  InferCreationAttributes<DefaultPrompt>
> {
  declare id: CreationOptional<string>;
  declare promptKey: DefaultPromptKey;
  declare promptText: string;
  declare supportingDetails: unknown | null;
  declare source: DefaultPromptSource;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DefaultPrompt.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    promptKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "prompt_key",
      validate: {
        isIn: [DEFAULT_PROMPT_KEYS]
      }
    },
    promptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "prompt_text"
    },
    supportingDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "supporting_details"
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [DEFAULT_PROMPT_SOURCES]
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "default_prompts",
    underscored: true
  }
);

export default DefaultPrompt;
