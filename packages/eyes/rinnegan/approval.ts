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

const PHASE_LABELS: Record<string, string> = {
  plan_approved: "Plan",
  scaffold_approved: "Scaffold",
  impl_approved: "Implementation",
  tests_approved: "Tests",
  docs_approved: "Docs",
  text_validated: "Evidence",
  consistent: "Consistency"
};

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

export function finalApproval(request: FinalApprovalRequest): EyeResponse {
  const summaryLines = [Heading.SUMMARY];
  const missingLabels: string[] = [];

  for (const [field, label] of Object.entries(PHASE_LABELS)) {
    const approved = request.payload[field as keyof typeof request.payload];
    const status = approved ? "OK" : "Pending";
    summaryLines.push(SUMMARY_BULLET_TEMPLATE.replace("{label}", label).replace("{status}", status));
    if (!approved) {
      missingLabels.push(label);
    }
  }

  const summaryMarkdown = summaryLines.join("\n");

  if (missingLabels.length > 0) {
    return buildResponse({
      tag: EyeTag.RINNEGAN,
      ok: false,
      code: StatusCode.E_PHASES_INCOMPLETE,
      md: `${Heading.FINAL_BLOCKED}\nOutstanding phases: ${missingLabels.join(", ")}`,
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
    md: `${Heading.FINAL_APPROVAL}\nAll phases approved. Host may deliver the final artifact.`,
    data: {
      [DataKey.APPROVED]: true,
      [DataKey.SUMMARY_MD]: summaryMarkdown
    },
    next_action: NextAction.RETURN_DELIVERABLE
  });
}
