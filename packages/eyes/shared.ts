import type { BaseEnvelope } from "./src/schemas/base";
import type { EyeStatusCodeType } from "./src/schemas/base";

export function buildResponse(params: {
  tag: string;
  ok: boolean;
  code: EyeStatusCodeType;
  md: string;
  data: Record<string, unknown>;
  next_action?: string;
  next?: string | string[];
}): BaseEnvelope {
  return {
    tag: params.tag,
    ok: params.ok,
    code: params.code,
    md: params.md,
    data: params.data,
    next_action: params.next_action,
    next: params.next ?? (params.next_action || 'CONTINUE')
  };
}
