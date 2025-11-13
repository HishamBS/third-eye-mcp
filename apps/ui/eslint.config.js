import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tailwindcss from "eslint-plugin-tailwindcss";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    plugins: {
      tailwindcss,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Enforce SSOT for Tailwind colors - block forbidden text color classes
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/text-brand-ink/]",
          message:
            '❌ SSOT VIOLATION: "text-brand-ink" is forbidden. Use text-brand-foreground or STATUS_TEXT_COLORS from color-mappings.ts',
        },
        {
          selector: "Literal[value=/text-brand-accent(?!\\/)/]",
          message:
            '⚠️  SSOT WARNING: "text-brand-accent" may not have proper contrast. Use STATUS_TEXT_COLORS from color-mappings.ts',
        },
        {
          selector: "Literal[value=/text-brand-paper/]",
          message:
            '❌ SSOT VIOLATION: "text-brand-paper" is a background color, not for text. Use text-brand-foreground',
        },
        {
          selector: "Literal[value=/text-brand-paperElev/]",
          message:
            '❌ SSOT VIOLATION: "text-brand-paperElev" is a background color, not for text. Use text-brand-foreground',
        },
      ],
      // Tailwind CSS plugin rules
      "tailwindcss/no-custom-classname": "off", // We use theme extensions
      "tailwindcss/classnames-order": "warn", // Enforce consistent class ordering
    },
  },
]);
