/**
 * Export utilities for Third Eye MCP
 * Supports Markdown, PDF, and JSON exports
 */

import { jsPDF } from "jspdf";

// Export format types
export type ExportFormat = "markdown" | "pdf" | "json";

// Session event type for exports
export interface ExportEvent {
  id: string;
  sessionId: string;
  eyeId?: string;
  eyeName?: string;
  stage?: string;
  status?: string;
  message: string;
  timestamp: string;
  latencyMs?: number;
  data?: unknown;
}

// Persona export type
export interface ExportPersona {
  id: string;
  eyeId: string;
  name: string;
  version: string;
  mission: string;
  overview: string;
  guidancePhase?: string;
  validationPhase?: string;
  envelope?: string;
  reminders?: string[];
  examples?: unknown[];
}

/**
 * Export session transcript as Markdown
 */
export function exportSessionAsMarkdown(
  sessionId: string,
  events: ExportEvent[],
  metadata?: { agent?: string; model?: string; createdAt?: string },
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Third Eye Session Transcript`);
  lines.push(`**Session ID:** ${sessionId}`);
  if (metadata?.agent) lines.push(`**Agent:** ${metadata.agent}`);
  if (metadata?.model) lines.push(`**Model:** ${metadata.model}`);
  if (metadata?.createdAt) lines.push(`**Created:** ${metadata.createdAt}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Events
  events.forEach((event, idx) => {
    const eyeIcon = getEyeIcon(event.eyeId);
    const stageBadge = event.stage ? `\`${event.stage}\`` : "";
    const latency = event.latencyMs ? ` *(${event.latencyMs}ms)*` : "";

    lines.push(
      `## ${idx + 1}. ${eyeIcon} ${event.eyeName || event.eyeId || "System"} ${stageBadge}${latency}`,
    );
    lines.push(`**Time:** ${event.timestamp}`);
    if (event.status) lines.push(`**Status:** ${event.status}`);
    lines.push("");
    lines.push(event.message);
    lines.push("");

    if (event.data) {
      lines.push("<details>");
      lines.push("<summary>Raw Data</summary>");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(event.data, null, 2));
      lines.push("```");
      lines.push("</details>");
      lines.push("");
    }
  });

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Exported from Third Eye MCP on ${new Date().toISOString()}*`);

  return lines.join("\n");
}

/**
 * Export session transcript as PDF
 */
export function exportSessionAsPDF(
  sessionId: string,
  events: ExportEvent[],
  metadata?: { agent?: string; model?: string; createdAt?: string },
): Blob {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = 280;

  // Helper to add new page if needed
  const checkPageBreak = () => {
    if (yPos > pageHeight) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFontSize(18);
  doc.text("Third Eye Session Transcript", 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Session ID: ${sessionId}`, 20, yPos);
  yPos += lineHeight;

  if (metadata?.agent) {
    doc.text(`Agent: ${metadata.agent}`, 20, yPos);
    yPos += lineHeight;
  }

  if (metadata?.model) {
    doc.text(`Model: ${metadata.model}`, 20, yPos);
    yPos += lineHeight;
  }

  if (metadata?.createdAt) {
    doc.text(`Created: ${metadata.createdAt}`, 20, yPos);
    yPos += lineHeight;
  }

  yPos += 10;
  checkPageBreak();

  // Events
  events.forEach((event, idx) => {
    doc.setFontSize(12);
    const title = `${idx + 1}. ${event.eyeName || event.eyeId || "System"}`;
    doc.text(title, 20, yPos);
    yPos += lineHeight;
    checkPageBreak();

    doc.setFontSize(9);
    if (event.stage) {
      doc.text(`Stage: ${event.stage}`, 25, yPos);
      yPos += lineHeight;
      checkPageBreak();
    }

    doc.text(`Time: ${event.timestamp}`, 25, yPos);
    yPos += lineHeight;
    checkPageBreak();

    if (event.latencyMs) {
      doc.text(`Latency: ${event.latencyMs}ms`, 25, yPos);
      yPos += lineHeight;
      checkPageBreak();
    }

    if (event.status) {
      doc.text(`Status: ${event.status}`, 25, yPos);
      yPos += lineHeight;
      checkPageBreak();
    }

    // Message (wrap text)
    doc.setFontSize(10);
    const messageLines = doc.splitTextToSize(event.message, 170);
    messageLines.forEach((line: string) => {
      doc.text(line, 25, yPos);
      yPos += lineHeight;
      checkPageBreak();
    });

    yPos += 5;
    checkPageBreak();
  });

  // Footer
  doc.setFontSize(8);
  doc.text(
    `Exported from Third Eye MCP on ${new Date().toISOString()}`,
    20,
    yPos,
  );

  return doc.output("blob");
}

/**
 * Export session transcript as JSON
 */
export function exportSessionAsJSON(
  sessionId: string,
  events: ExportEvent[],
  metadata?: { agent?: string; model?: string; createdAt?: string },
): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: "1.0",
    session: {
      id: sessionId,
      ...metadata,
    },
    events,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export persona as Markdown
 */
export function exportPersonaAsMarkdown(persona: ExportPersona): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${persona.name}`);
  lines.push(`**Eye:** ${persona.eyeId} | **Version:** ${persona.version}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Mission
  lines.push(`## Mission`);
  lines.push(persona.mission);
  lines.push("");

  // Overview
  if (persona.overview) {
    lines.push(`## Overview`);
    lines.push(persona.overview);
    lines.push("");
  }

  // Guidance Phase
  if (persona.guidancePhase) {
    lines.push(`## Guidance Phase`);
    lines.push(persona.guidancePhase);
    lines.push("");
  }

  // Validation Phase
  if (persona.validationPhase) {
    lines.push(`## Validation Phase`);
    lines.push(persona.validationPhase);
    lines.push("");
  }

  // Envelope
  if (persona.envelope) {
    lines.push(`## Envelope Contract`);
    lines.push(persona.envelope);
    lines.push("");
  }

  // Reminders
  if (persona.reminders && persona.reminders.length > 0) {
    lines.push(`## Reminders`);
    persona.reminders.forEach((reminder, idx) => {
      lines.push(`${idx + 1}. ${reminder}`);
    });
    lines.push("");
  }

  // Examples
  if (persona.examples && persona.examples.length > 0) {
    lines.push(`## Examples`);
    persona.examples.forEach((example, idx) => {
      lines.push(`### Example ${idx + 1}`);
      lines.push("```json");
      lines.push(JSON.stringify(example, null, 2));
      lines.push("```");
      lines.push("");
    });
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Exported from Third Eye MCP on ${new Date().toISOString()}*`);

  return lines.join("\n");
}

/**
 * Export persona as PDF
 */
export function exportPersonaAsPDF(persona: ExportPersona): Blob {
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = 280;

  const checkPageBreak = () => {
    if (yPos > pageHeight) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFontSize(18);
  doc.text(persona.name, 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Eye: ${persona.eyeId} | Version: ${persona.version}`, 20, yPos);
  yPos += 15;
  checkPageBreak();

  // Mission
  doc.setFontSize(14);
  doc.text("Mission", 20, yPos);
  yPos += lineHeight;

  doc.setFontSize(10);
  const missionLines = doc.splitTextToSize(persona.mission, 170);
  missionLines.forEach((line: string) => {
    doc.text(line, 20, yPos);
    yPos += lineHeight;
    checkPageBreak();
  });
  yPos += 10;

  // Overview
  if (persona.overview) {
    doc.setFontSize(14);
    doc.text("Overview", 20, yPos);
    yPos += lineHeight;

    doc.setFontSize(10);
    const overviewLines = doc.splitTextToSize(persona.overview, 170);
    overviewLines.forEach((line: string) => {
      doc.text(line, 20, yPos);
      yPos += lineHeight;
      checkPageBreak();
    });
    yPos += 10;
  }

  // Add other sections similarly...
  doc.setFontSize(8);
  doc.text(
    `Exported from Third Eye MCP on ${new Date().toISOString()}`,
    20,
    pageHeight - 10,
  );

  return doc.output("blob");
}

/**
 * Helper: Get Eye icon for display
 */
function getEyeIcon(eyeId?: string): string {
  const icons: Record<string, string> = {
    overseer: "🧿",
    sharingan: "🔍",
    kyuubi: "✨",
    jogan: "👁️",
    rinnegan: "📋",
    mangekyo: "🔍",
    tenseigan: "🔬",
    byakugan: "✅",
  };
  return eyeId ? icons[eyeId] || "👁️" : "🤖";
}

/**
 * Helper: Trigger browser download
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string,
) {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mimeType })
      : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function - exports session based on format
 */
export function exportSession(
  format: ExportFormat,
  sessionId: string,
  events: ExportEvent[],
  metadata?: { agent?: string; model?: string; createdAt?: string },
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  switch (format) {
    case "markdown": {
      const content = exportSessionAsMarkdown(sessionId, events, metadata);
      downloadFile(
        content,
        `session-${sessionId}-${timestamp}.md`,
        "text/markdown",
      );
      break;
    }
    case "pdf": {
      const blob = exportSessionAsPDF(sessionId, events, metadata);
      downloadFile(
        blob,
        `session-${sessionId}-${timestamp}.pdf`,
        "application/pdf",
      );
      break;
    }
    case "json": {
      const content = exportSessionAsJSON(sessionId, events, metadata);
      downloadFile(
        content,
        `session-${sessionId}-${timestamp}.json`,
        "application/json",
      );
      break;
    }
  }
}

/**
 * Main export function - exports persona based on format
 */
export function exportPersona(format: ExportFormat, persona: ExportPersona) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `persona-${persona.eyeId}-v${persona.version}-${timestamp}`;

  switch (format) {
    case "markdown": {
      const content = exportPersonaAsMarkdown(persona);
      downloadFile(content, `${filename}.md`, "text/markdown");
      break;
    }
    case "pdf": {
      const blob = exportPersonaAsPDF(persona);
      downloadFile(blob, `${filename}.pdf`, "application/pdf");
      break;
    }
    case "json": {
      const content = JSON.stringify(persona, null, 2);
      downloadFile(content, `${filename}.json`, "application/json");
      break;
    }
  }
}
