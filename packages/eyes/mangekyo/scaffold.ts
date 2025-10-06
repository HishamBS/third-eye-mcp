import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

interface FileEntry {
  path: string;
  intent: "create" | "modify" | "delete";
  reason: string;
}

function getStrictness(request: ReviewScaffoldRequest): "lenient" | "normal" | "strict" {
  const settings = request.context?.settings;
  const value = settings?.mangekyo;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "lenient" || lowered === "normal" || lowered === "strict") {
      return lowered as "lenient" | "normal" | "strict";
    }
  }
  return "normal";
}

export interface ReviewScaffoldRequest {
  payload: {
    files: FileEntry[];
  };
  reasoning_md?: string;
  context?: {
    settings?: {
      mangekyo?: string;
    };
  };
}

export function reviewScaffold(request: ReviewScaffoldRequest): EyeResponse {
  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md: `${Heading.REASONING}\nProvide reasoning for proposed scaffold changes.`,
      data: { [DataKey.ISSUES_MD]: "Reasoning required." },
      next_action: NextAction.RESUBMIT_SCAFFOLD
    });
  }

  const files = request.payload.files;
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const file of files) {
    const path = file.path;
    if (seen.has(path)) {
      duplicates.push(path);
    }
    seen.add(path);
  }

  if (duplicates.length > 0) {
    const issueLines = duplicates.map(path => `- Duplicate entry for \`${path}\``).join("\n");
    const md = `${Heading.SCAFFOLD_REJECTED}\n${issueLines}`;
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_SCAFFOLD_ISSUES,
      md,
      data: {
        [DataKey.ISSUES_MD]: issueLines,
        mangekyo_strictness: getStrictness(request)
      },
      next_action: NextAction.RESUBMIT_SCAFFOLD
    });
  }

  const level = getStrictness(request);
  const checklistLines = [
    Heading.SCAFFOLD_CHECKLIST,
    ...files.map(file => `- \`${file.path}\` → ${file.intent}: ${file.reason}`),
    `- Strictness: ${level.charAt(0).toUpperCase() + level.slice(1)}`
  ];
  const checklist = checklistLines.join("\n");

  const data = {
    [DataKey.CHECKLIST_MD]: checklist,
    [DataKey.ISSUES_MD]: "",
    mangekyo_strictness: level
  };

  const md = `${Heading.SCAFFOLD_APPROVED}\nScaffold looks ready.`;

  return buildResponse({
    tag: EyeTag.MANGEKYO,
    ok: true,
    code: StatusCode.OK_SCAFFOLD_APPROVED,
    md,
    data,
    next_action: NextAction.GO_TO_IMPL
  });
}
