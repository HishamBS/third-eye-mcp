/**
 * Eye Renderer Registry
 *
 * Dispatches structured data to eye-specific renderer components.
 * Each eye renders its unique data shape with dedicated visualization.
 */

"use client";

import { memo, type ComponentType } from "react";
import type { EyeId } from "@third-eye/constants";
import type { EyeRendererProps } from "./types";

import { SharinganResult } from "./SharinganResult";
import { KyuubiResult } from "./KyuubiResult";
import { JoganResult } from "./JoganResult";
import { RinneganResult } from "./RinneganResult";
import { MangekyoResult } from "./MangekyoResult";
import { TenseiganResult } from "./TenseiganResult";
import { ByakuganResult } from "./ByakuganResult";

const EYE_RENDERER_MAP: Partial<
  Record<EyeId, ComponentType<EyeRendererProps>>
> = {
  sharingan: SharinganResult,
  kyuubi: KyuubiResult,
  jogan: JoganResult,
  rinnegan: RinneganResult,
  mangekyo: MangekyoResult,
  tenseigan: TenseiganResult,
  byakugan: ByakuganResult,
};

interface EyeStructuredDataProps {
  eye: EyeId;
  data: Record<string, unknown>;
  eyeColor: string;
}

function EyeStructuredDataInner({
  eye,
  data,
  eyeColor,
}: EyeStructuredDataProps) {
  const Renderer = EYE_RENDERER_MAP[eye];
  if (!Renderer) return null;
  return <Renderer data={data} eyeColor={eyeColor} />;
}

export const EyeStructuredData = memo(EyeStructuredDataInner);
EyeStructuredData.displayName = "EyeStructuredData";

export type { EyeRendererProps, EyeStructuredDataProps };
