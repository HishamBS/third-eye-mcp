import { Hono } from 'hono';
import { getDb, mcpIntegrations, type McpIntegration, type NewMcpIntegration } from '@third-eye/db';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { homedir } from 'os';
import { resolve } from 'path';

/**
 * MCP Integrations Routes
 *
 * CRUD for AI tool connection configurations
 */

const app = new Hono();

// Get installation paths for template rendering
function getInstallationPaths() {
  const home = homedir();
  const cwd = process.cwd();
  const mcpBin = resolve(cwd, 'bin/mcp-server.ts');

  return {
    HOME: home,
    MCP_PATH: cwd,
    MCP_BIN: mcpBin,
    PLATFORM: process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux',
    USER: process.env.USER || process.env.USERNAME || 'user',
  };
}

// Replace template placeholders
function renderTemplate(template: string, paths: ReturnType<typeof getInstallationPaths>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(paths)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return rendered;
}

// GET /integrations - List all integrations
app.get('/', async (c) => {
  const { db } = getDb();
  const enabledOnly = c.req.query('enabled') === 'true';

  let query = db.select().from(mcpIntegrations);

  if (enabledOnly) {
    query = query.where(eq(mcpIntegrations.enabled, true)) as any;
  }

  const integrations = await query.orderBy(mcpIntegrations.displayOrder);

  return c.json({ integrations });
});

// GET /integrations/:id - Get single integration
app.get('/:id', async (c) => {
  const { db } = getDb();
  const id = c.req.param('id');

  const integration = await db.select()
    .from(mcpIntegrations)
    .where(eq(mcpIntegrations.id, id))
    .limit(1);

  if (!integration || integration.length === 0) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  return c.json({ integration: integration[0] });
});

// GET /integrations/:id/config - Get rendered config
app.get('/:id/config', async (c) => {
  const { db } = getDb();
  const id = c.req.param('id');

  const integration = await db.select()
    .from(mcpIntegrations)
    .where(eq(mcpIntegrations.id, id))
    .limit(1);

  if (!integration || integration.length === 0) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  const paths = getInstallationPaths();
  const renderedConfig = renderTemplate(integration[0].configTemplate, paths);

  return c.json({
    config: renderedConfig,
    configType: integration[0].configType,
    configFiles: integration[0].configFiles,
    paths,
  });
});

// POST /integrations - Create new integration
app.post('/', async (c) => {
  const { db } = getDb();
  const body = await c.req.json();

  const newIntegration: NewMcpIntegration = {
    id: nanoid(),
    name: body.name,
    slug: body.slug,
    logoUrl: body.logoUrl || null,
    description: body.description || null,
    status: body.status || 'community',
    platforms: body.platforms || ['macos', 'windows', 'linux'],
    configType: body.configType,
    configFiles: body.configFiles,
    configTemplate: body.configTemplate,
    setupSteps: body.setupSteps || [],
    docsUrl: body.docsUrl || null,
    enabled: body.enabled !== undefined ? body.enabled : true,
    displayOrder: body.displayOrder || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(mcpIntegrations).values(newIntegration);

  return c.json({ integration: newIntegration }, 201);
});

// PUT /integrations/:id - Update integration
app.put('/:id', async (c) => {
  const { db } = getDb();
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select()
    .from(mcpIntegrations)
    .where(eq(mcpIntegrations.id, id))
    .limit(1);

  if (!existing || existing.length === 0) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  const updated = {
    ...body,
    id, // Preserve ID
    updatedAt: new Date(),
  };

  await db.update(mcpIntegrations)
    .set(updated)
    .where(eq(mcpIntegrations.id, id));

  return c.json({ integration: updated });
});

// DELETE /integrations/:id - Delete integration
app.delete('/:id', async (c) => {
  const { db } = getDb();
  const id = c.req.param('id');

  const existing = await db.select()
    .from(mcpIntegrations)
    .where(eq(mcpIntegrations.id, id))
    .limit(1);

  if (!existing || existing.length === 0) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  await db.delete(mcpIntegrations)
    .where(eq(mcpIntegrations.id, id));

  return c.json({ success: true });
});

// GET /installation-path - Get MCP installation path
app.get('/installation-path', async (c) => {
  const paths = getInstallationPaths();
  return c.json(paths);
});

export default app;
