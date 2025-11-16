#!/usr/bin/env bun
/**
 * Bun-native Next.js dev server wrapper
 *
 * This bypasses the Next.js CLI binary (which has #!/usr/bin/env node shebang)
 * and runs Next.js directly under Bun runtime.
 */

const port = parseInt(process.env.PORT || process.argv[2] || "3300");

// Dynamic import to ensure Bun handles the module resolution
const startServer = async () => {
  const next = (await import("next")).default;

  const app = next({
    dev: true,
    port,
    hostname: "127.0.0.1",
  });

  const handle = app.getRequestHandler();

  await app.prepare();

  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch: async (req) => {
      await handle(req);
      return new Response();
    },
  });

  console.log(`▲ Next.js ready on http://127.0.0.1:${port}`);
  console.log(`✓ Running under Bun v${Bun.version}`);
};

startServer().catch((err) => {
  console.error("Failed to start Next.js dev server:", err);
  process.exit(1);
});
