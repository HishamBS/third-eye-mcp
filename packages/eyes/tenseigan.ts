import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";

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
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md: `${Heading.REASONING}\nExplain how the evidence was reviewed before submitting.`,
      data: { [DataKey.ISSUES_MD]: "Reasoning required." },
      next_action: NextAction.ADD_CITATIONS
    });
  }

  if (!hasCitations(draftMarkdown)) {
    const md = `${Heading.CITATIONS}\nProvide a citations table for each factual claim.`;
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_CITATIONS_MISSING,
      md,
      data: { [DataKey.ISSUES_MD]: "Citations table missing or incomplete." },
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
    const issuesMarkdown = `${Heading.CITATIONS}\n${weakCitations.map(w => `- ${w}`).join("\n")}`;
    return buildResponse({
      tag: EyeTag.TENSEIGAN,
      ok: false,
      code: StatusCode.E_CITATIONS_MISSING,
      md: `${Heading.CITATIONS}\nCitations fall below confidence threshold (${cutoff.toFixed(2)}).`,
      data: { [DataKey.ISSUES_MD]: issuesMarkdown },
      next_action: NextAction.ADD_CITATIONS
    });
  }

  const md = `${Heading.CLAIMS_VALIDATED}\nCitations present for each claim.`;
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
