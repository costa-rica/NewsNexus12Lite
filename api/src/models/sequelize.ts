import { Sequelize } from "sequelize";

const nodeEnv = process.env.NODE_ENV ?? "development";
const databaseUrl =
  process.env.DATABASE_URL ??
  (nodeEnv === "test"
    ? "postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite_test"
    : undefined);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Sequelize");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: nodeEnv === "development" ? console.log : false
});

export default sequelize;
