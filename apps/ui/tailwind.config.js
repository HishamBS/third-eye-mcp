import { generateTailwindThemeConfig } from "@third-eye/theme";
/**
 * Tailwind Configuration
 *
 * CRITICAL: This config is PROGRAMMATICALLY GENERATED from packages/theme/src/themes.ts
 *
 * SSOT ENFORCEMENT:
 * - Theme colors are NOT manually defined here
 * - All theme definitions come from @third-eye/theme package
 * - Changes to themes.ts automatically propagate here
 * - This eliminates theme duplication and prevents drift
 *
 * To modify themes:
 * 1. Edit packages/theme/src/themes.ts (SSOT)
 * 2. Rebuild - changes apply automatically
 * 3. NEVER manually edit theme colors in this file
 */
const { cssVariables, eyeColors } = generateTailwindThemeConfig();
const config = {
    darkMode: ["class", '[data-mode="dark"]'],
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: "rgb(var(--color-primary) / <alpha-value>)",
                    accent: "rgb(var(--color-accent) / <alpha-value>)",
                    ink: "rgb(var(--color-ink) / <alpha-value>)",
                    paper: "rgb(var(--color-paper) / <alpha-value>)",
                    paperElev: "rgb(var(--color-paper-elev) / <alpha-value>)",
                    outline: "rgb(var(--color-outline) / <alpha-value>)",
                    foreground: "rgb(var(--color-foreground) / <alpha-value>)",
                },
                // Semantic colors - programmatically generated from SSOT
                semantic: {
                    success: "rgb(var(--color-success) / <alpha-value>)",
                    warning: "rgb(var(--color-warning) / <alpha-value>)",
                    error: "rgb(var(--color-error) / <alpha-value>)",
                    info: "rgb(var(--color-info) / <alpha-value>)",
                    muted: "rgb(var(--color-muted) / <alpha-value>)",
                },
                // Eye colors - programmatically generated from SSOT
                eye: eyeColors,
            },
            boxShadow: {
                glass: "0 10px 30px rgb(var(--color-ink) / 0.35)",
                "glass-light": "0 10px 30px rgb(var(--color-ink) / 0.15)",
            },
            borderRadius: {
                xl2: "1.25rem",
            },
            fontFamily: {
                display: ['"InterVariable"', "ui-sans-serif", "system-ui"],
                mono: ['"GeistMono"', "ui-monospace", "SFMono-Regular"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [
        // Theme CSS variables - programmatically generated from SSOT
        function ({ addBase }) {
            addBase(cssVariables);
        },
    ],
};
export default config;
//# sourceMappingURL=tailwind.config.js.map