import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes
} from "sequelize";

import { sequelize } from "./sequelize";

export class ArticleFixture extends Model<
  InferAttributes<ArticleFixture>,
  InferCreationAttributes<ArticleFixture>
> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare source: string;
  declare description: string;
  declare url: string;
  declare publishedAt: Date | null;
  declare rawData: unknown;
  declare createdAt: CreationOptional<Date>;
}

ArticleFixture.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "published_at"
    },
    rawData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "raw_data"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    }
  },
  {
    sequelize,
    tableName: "article_fixtures",
    underscored: true,
    updatedAt: false
  }
);

export default ArticleFixture;
