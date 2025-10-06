import type { EyeResponse } from "./constants";
import { EyeTag, StatusCode } from "./constants";

export function buildResponse(params: {
  tag: EyeTag;
  ok: boolean;
  code: StatusCode;
  md: string;
  data: Record<string, any>;
  next_action: string;
}): EyeResponse {
  return {
    tag: params.tag,
    ok: params.ok,
    code: params.code,
    md: params.md,
    data: params.data,
    next_action: params.next_action
  };
}
