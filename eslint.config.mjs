import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig([
  globalIgnores(["**/dist"]),
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
          },
        },
      },
      prettier,
    ],

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 2022,
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
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", name: ["suite", "test"], package: "node:test" },
          ],
        },
      ],
    },
  },
]);
