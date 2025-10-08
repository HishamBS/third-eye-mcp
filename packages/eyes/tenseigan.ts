import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";
import { MarkdownBuilder } from "./utils/markdown-builder";

const DEFAULT_CUTOFF = 0.80;

function hasCitations(markdown: string): boolean {
  const lower = markdown.toLowerCase();
  if (!lower.includes("### citations")) {
    return false;
  }
  return markdown.includes("|");
}

export interface CitationEntry {
  statement: string;
  citation: string | null;
  confidence: number | null;
}

export interface TenseiganRequest {
  payload: {
    draft_md: string;
    citations?: CitationEntry[];
  };
  reasoning_md?: string;
  context?: {
    settings?: {
      citation_cutoff?: number;
    };
  };
}

export function validateClaims(request: TenseiganRequest): EyeResponse {
  const draftMarkdown = request.payload.draft_md || "";

  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    const md = MarkdownBuilder.create()
      .heading(Heading.REASONING)
      .text("Explain how the evidence was reviewed before submitting.")
      .build();
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md,
      data: {
        [DataKey.ISSUES_MD]: MarkdownBuilder.create()
          .heading(Heading.REASONING)
          .text("Reasoning required.")
          .build()
      },
      next_action: NextAction.ADD_CITATIONS
    });
  }

  if (!hasCitations(draftMarkdown)) {
    const md = MarkdownBuilder.create()
      .heading(Heading.CITATIONS)
      .text("Provide a citations table for each factual claim.")
      .build();
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_CITATIONS_MISSING,
      md,
      data: {
        [DataKey.ISSUES_MD]: MarkdownBuilder.create()
          .heading(Heading.CITATIONS)
          .text("Citations table missing or incomplete.")
          .build()
      },
      next_action: NextAction.ADD_CITATIONS
    });
  }

  const cutoff = request.context?.settings?.citation_cutoff ?? DEFAULT_CUTOFF;
  const weakCitations: string[] = [];

  if (request.payload.citations) {
    for (const entry of request.payload.citations) {
      const confidence = entry.confidence ?? 0.0;
      const citation = entry.citation || "(missing)";
      if (confidence < cutoff || !entry.citation) {
        weakCitations.push(`${entry.statement} → ${citation} (${confidence.toFixed(2)})`);
      }
    }
  }

  if (weakCitations.length > 0) {
    const issuesMarkdown = MarkdownBuilder.create()
      .heading(Heading.CITATIONS)
      .bullets(weakCitations)
      .build();
    const md = MarkdownBuilder.create()
      .heading(Heading.CITATIONS)
      .text(`Citations fall below confidence threshold (${cutoff.toFixed(2)}).`)
      .build();
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_CITATIONS_MISSING,
      md,
      data: { [DataKey.ISSUES_MD]: issuesMarkdown },
      next_action: NextAction.ADD_CITATIONS
    });
  }

  const md = MarkdownBuilder.create()
    .heading(Heading.CLAIMS_VALIDATED)
    .text("Citations present for each claim.")
    .build();
  const data = {
    [DataKey.ISSUES_MD]: "",
    [DataKey.CLAIMS_MD]: draftMarkdown
  };

  return buildResponse({
    tag: EyeTag.TENSEIGAN,
    ok: true,
    code: StatusCode.OK_TEXT_VALIDATED,
    md,
    data,
    next_action: NextAction.GO_TO_BYAKUGAN
  });
}
