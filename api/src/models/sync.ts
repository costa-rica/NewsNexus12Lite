import { sequelize } from "./sequelize";
import "./ArticleFixture";
import "./DefaultPrompt";

export async function syncModels(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";

  await sequelize.sync({ alter: !isProduction });
}

export default syncModels;
