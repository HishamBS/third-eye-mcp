import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey,
  SUMMARY_BULLET_TEMPLATE
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";
import { MarkdownBuilder } from "../utils/markdown-builder";

export interface FinalApprovalRequest {
  payload: {
    plan_approved: boolean;
    scaffold_approved: boolean;
    impl_approved: boolean;
    tests_approved: boolean;
    docs_approved: boolean;
    text_validated: boolean;
    consistent: boolean;
  };
}

type PhaseKey = keyof FinalApprovalRequest["payload"];

const PHASES: Array<{ key: PhaseKey; label: string }> = [
  { key: "plan_approved", label: "Plan" },
  { key: "scaffold_approved", label: "Scaffold" },
  { key: "impl_approved", label: "Implementation" },
  { key: "tests_approved", label: "Tests" },
  { key: "docs_approved", label: "Docs" },
  { key: "text_validated", label: "Evidence" },
  { key: "consistent", label: "Consistency" }
];

export function finalApproval(request: FinalApprovalRequest): EyeResponse {
  const summaryBuilder = MarkdownBuilder.create().heading(Heading.SUMMARY);
  const missingLabels: string[] = [];

  for (const phase of PHASES) {
    const approved = request.payload[phase.key];
    const status = approved ? "OK" : "Pending";
    summaryBuilder.bullet(
      SUMMARY_BULLET_TEMPLATE.replace("{label}", phase.label).replace("{status}", status)
    );
    if (!approved) {
      missingLabels.push(phase.label);
    }
  }

  const summaryMarkdown = summaryBuilder.build();

  if (missingLabels.length > 0) {
    const md = MarkdownBuilder.create()
      .heading(Heading.FINAL_BLOCKED)
      .text(`Outstanding phases: ${missingLabels.join(", ")}`)
      .build();

    return buildResponse({
      tag: EyeTag.RINNEGAN,
      ok: false,
      code: StatusCode.E_PHASES_INCOMPLETE,
      md,
      data: {
        [DataKey.APPROVED]: false,
        [DataKey.SUMMARY_MD]: summaryMarkdown
      },
      next_action: NextAction.COMPLETE_PHASES
    });
  }

  return buildResponse({
    tag: EyeTag.RINNEGAN,
    ok: true,
    code: StatusCode.OK_ALL_APPROVED,
    md: MarkdownBuilder.create()
      .heading(Heading.FINAL_APPROVAL)
      .text("All phases approved. Host may deliver the final artifact.")
      .build(),
    data: {
      [DataKey.APPROVED]: true,
      [DataKey.SUMMARY_MD]: summaryMarkdown
    },
    next_action: NextAction.RETURN_DELIVERABLE
  });
}
