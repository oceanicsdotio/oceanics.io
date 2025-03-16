// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  globalIgnores([
    "node_modules/",
    ".netlify/",
    ".vscode/",
    ".github/",
    ".idea/",
    ".next/",
    ".yarn/",
    "out/",
    "app/lib/",
    "app/target/",
    "functions/lib/",
    "functions/target/",
    "jest.config.cjs"
  ]),
  {
    rules: {
      "no-empty-pattern": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
