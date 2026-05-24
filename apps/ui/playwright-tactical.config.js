import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "./tests/e2e",
    testMatch: "monitor-tactical.spec.ts",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    reporter: "list",
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3300",
        trace: "off",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
//# sourceMappingURL=playwright-tactical.config.js.map