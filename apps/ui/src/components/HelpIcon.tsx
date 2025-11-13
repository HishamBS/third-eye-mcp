"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { UI_HELP_TEXT, type UiHelpTextKey } from "@third-eye/constants";

interface HelpIconProps {
  helpTextKey: UiHelpTextKey;
  position?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = Object.freeze({
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
});

export function HelpIcon({
  helpTextKey,
  position = "top",
  size = "sm",
}: HelpIconProps) {
  return (
    <Tooltip
      helpTextKey={helpTextKey}
      helpTextMap={UI_HELP_TEXT}
      position={position}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full text-semantic-muted hover:text-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-ink"
        aria-label={UI_HELP_TEXT[helpTextKey]}
      >
        <HelpCircle className={SIZE_CLASSES[size]} />
      </button>
    </Tooltip>
  );
}
