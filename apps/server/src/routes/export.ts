import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { sessions, runs, pipelineEvents } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

/**
 * Export API
 *
 * Export session data in multiple formats: PDF, HTML, JSON, Markdown
 */

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

type ExportFormat = 'pdf' | 'html' | 'json' | 'md';

/**
 * GET /api/export/:sessionId - Export session data
 */
app.get('/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const format = (c.req.query('format') || 'json') as ExportFormat;

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)
      .all();

    if (session.length === 0) {
      return createErrorResponse(c, { title: 'Session Not Found', status: 404, detail: 'The requested session could not be found' });
    }

    // Get all runs for this session
    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .all();

    // Get all events for this session
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .orderBy(desc(pipelineEvents.createdAt))
      .all();

    const exportData = {
      session: session[0],
      runs: sessionRuns,
      events,
      exportedAt: new Date().toISOString(),
    };

    switch (format) {
      case 'json':
        c.header('Content-Disposition', `attachment; filename="third-eye-session-${sessionId}.json"`);
        return createSuccessResponse(c, exportData);

      case 'md':
        const markdown = generateMarkdown(exportData);
        return c.text(markdown, 200, {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="third-eye-session-${sessionId}.md"`,
        });

      case 'html':
        const html = generateHTML(exportData);
        return c.html(html, 200, {
          'Content-Disposition': `attachment; filename="third-eye-session-${sessionId}.html"`,
        });

      case 'pdf':
        // PDF generation would require a library like puppeteer or pdfkit
        // For now, we'll generate HTML and suggest user print to PDF
        const pdfHtml = generateHTML(exportData, true);
        return c.html(pdfHtml, 200, {
          'Content-Disposition': `inline; filename="third-eye-session-${sessionId}.html"`,
        });

      default:
        return createErrorResponse(c, { title: 'Invalid Format', status: 400, detail: 'Supported formats: pdf, html, json, md' });
    }
  } catch (error) {
    console.error('Export failed:', error);
    return createInternalErrorResponse(c, `Failed to export session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Generate Markdown export
 */
function generateMarkdown(data: any): string {
  const { session, runs, events } = data;

  let md = `# Third Eye Session Export\n\n`;
  md += `**Session ID:** ${session.id}\n`;
  md += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
  md += `**Status:** ${session.status}\n`;
  md += `**Exported:** ${data.exportedAt}\n\n`;

  if (session.configJson) {
    md += `## Configuration\n\n\`\`\`json\n${JSON.stringify(session.configJson, null, 2)}\n\`\`\`\n\n`;
  }

  md += `## Timeline Events (${events.length})\n\n`;
  events.forEach((event: any, index: number) => {
    md += `### ${index + 1}. ${event.type} - ${event.eye || 'system'}\n`;
    md += `- **Code:** ${event.code || 'N/A'}\n`;
    md += `- **Time:** ${new Date(event.createdAt).toLocaleString()}\n`;
    if (event.md) {
      md += `- **Summary:** ${event.md}\n`;
    }
    md += `\n`;
  });

  md += `## Eye Runs (${runs.length})\n\n`;
  runs.forEach((run: any, index: number) => {
    md += `### ${index + 1}. ${run.eye}\n`;
    md += `- **Provider:** ${run.provider}\n`;
    md += `- **Model:** ${run.model}\n`;
    md += `- **Latency:** ${run.latencyMs || 'N/A'}ms\n`;
    md += `- **Tokens In:** ${run.tokensIn || 'N/A'}\n`;
    md += `- **Tokens Out:** ${run.tokensOut || 'N/A'}\n`;
    md += `- **Time:** ${new Date(run.createdAt).toLocaleString()}\n`;
    md += `\n**Input:**\n\`\`\`\n${run.inputMd}\n\`\`\`\n\n`;
    if (run.outputJson) {
      md += `**Output:**\n\`\`\`json\n${JSON.stringify(run.outputJson, null, 2)}\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
  });

  return md;
}

/**
 * Generate HTML export
 */
function generateHTML(data: any, forPrint = false): string {
  const { session, runs, events } = data;

  const printStyles = forPrint
    ? `
    @media print {
      body { font-size: 12pt; }
      .no-print { display: none; }
      h1 { page-break-before: always; }
    }
    `
    : '';

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Third Eye Session ${session.id}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #0f172a;
      color: #e2e8f0;
    }
    h1 { color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 0.5rem; }
    h2 { color: #7dd3fc; margin-top: 2rem; }
    h3 { color: #bae6fd; margin-top: 1.5rem; }
    .meta { background: #1e293b; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .meta strong { color: #38bdf8; }
    .event { background: #1e293b; padding: 1rem; border-radius: 8px; margin: 1rem 0; border-left: 4px solid #38bdf8; }
    .run { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #7dd3fc; }
    pre { background: #0f172a; padding: 1rem; border-radius: 4px; overflow-x: auto; border: 1px solid #334155; }
    code { color: #fbbf24; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .stat { background: #334155; padding: 0.75rem; border-radius: 6px; }
    .stat-label { color: #94a3b8; font-size: 0.875rem; }
    .stat-value { color: #38bdf8; font-size: 1.25rem; font-weight: bold; }
    ${printStyles}
  </style>
</head>
<body>
  <h1>🧿 Third Eye Session Export</h1>

  <div class="meta">
    <p><strong>Session ID:</strong> ${session.id}</p>
    <p><strong>Created:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
    <p><strong>Status:</strong> ${session.status}</p>
    <p><strong>Exported:</strong> ${data.exportedAt}</p>
  </div>

  ${
    session.configJson
      ? `<h2>Configuration</h2>
  <pre><code>${JSON.stringify(session.configJson, null, 2)}</code></pre>`
      : ''
  }

  <h2>Statistics</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-label">Total Events</div>
      <div class="stat-value">${events.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Eye Runs</div>
      <div class="stat-value">${runs.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Tokens</div>
      <div class="stat-value">${runs.reduce(
        (sum: number, r: any) => sum + (r.tokensIn || 0) + (r.tokensOut || 0),
        0
      )}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Avg Latency</div>
      <div class="stat-value">${
        runs.length > 0
          ? Math.round(runs.reduce((sum: number, r: any) => sum + (r.latencyMs || 0), 0) / runs.length)
          : 0
      }ms</div>
    </div>
  </div>

  <h2>Timeline Events (${events.length})</h2>
  ${events
    .map(
      (event: any, index: number) => `
    <div class="event">
      <h3>${index + 1}. ${event.type} - ${event.eye || 'system'}</h3>
      <p><strong>Code:</strong> ${event.code || 'N/A'}</p>
      <p><strong>Time:</strong> ${new Date(event.createdAt).toLocaleString()}</p>
      ${event.md ? `<p><strong>Summary:</strong> ${event.md}</p>` : ''}
      ${event.dataJson ? `<details><summary>Data</summary><pre><code>${JSON.stringify(event.dataJson, null, 2)}</code></pre></details>` : ''}
    </div>
  `
    )
    .join('')}

  <h2>Eye Runs (${runs.length})</h2>
  ${runs
    .map(
      (run: any, index: number) => `
    <div class="run">
      <h3>${index + 1}. ${run.eye}</h3>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Provider</div>
          <div class="stat-value">${run.provider}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Model</div>
          <div class="stat-value">${run.model}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Latency</div>
          <div class="stat-value">${run.latencyMs || 'N/A'}ms</div>
        </div>
        <div class="stat">
          <div class="stat-label">Tokens</div>
          <div class="stat-value">${(run.tokensIn || 0) + (run.tokensOut || 0)}</div>
        </div>
      </div>
      <p><strong>Time:</strong> ${new Date(run.createdAt).toLocaleString()}</p>
      <h4>Input</h4>
      <pre><code>${escapeHtml(run.inputMd)}</code></pre>
      ${
        run.outputJson
          ? `<h4>Output</h4>
      <pre><code>${escapeHtml(JSON.stringify(run.outputJson, null, 2))}</code></pre>`
          : ''
      }
    </div>
  `
    )
    .join('')}

  ${
    forPrint
      ? `<div class="no-print" style="margin-top: 2rem; padding: 1rem; background: #1e293b; border-radius: 8px;">
    <p><strong>Note:</strong> Use your browser's Print function (Cmd/Ctrl+P) and select "Save as PDF" to create a PDF version of this report.</p>
  </div>`
      : ''
  }
</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default app;
