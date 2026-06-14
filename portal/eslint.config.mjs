import next from "eslint-config-next";
import tseslint from "typescript-eslint";

const config = [
  ...next,
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"]
  }
];

export default config;
