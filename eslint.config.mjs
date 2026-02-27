import { defineConfig, globalIgnores } from "eslint/config";
import functional from "eslint-plugin-functional";
import node from "eslint-plugin-node";
import globals from "globals";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.__dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(["**/dist"]),
  {
    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier"
    ),

    plugins: {
      functional,
      node,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.amd,
      },

      ecmaVersion: 5,
      sourceType: "commonjs",
    },

    rules: {
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "functional/no-let": "error",
    },
  },
]);
