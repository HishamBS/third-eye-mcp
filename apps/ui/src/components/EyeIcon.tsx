import { useEffect, useState } from "react";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { API_BASE_URL } from "@/constants/api";
import { METRIC_COLORS } from "@/constants/design-tokens";

interface EyeIconProps {
  eye: string;
  size?: number;
  className?: string;
  iconSvg?: string; // Optional pre-fetched SVG from node data
}

/**
 * Eye Icon Component - Database-only SVG source
 * NO EMOJIS - All icons are SVG content from database
 *
 * Priority:
 * 1. Pre-provided iconSvg (from node data)
 * 2. Database SVG (fetched via API from eyes.iconSvg)
 * 3. Placeholder if not available
 */
export function EyeIcon({
  eye,
  size = 24,
  className = "",
  iconSvg,
}: EyeIconProps) {
  // Early return if eye name is invalid
  if (!eye || typeof eye !== "string") {
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full ${className}`}
        style={{ width: size, height: size }}
        title="Invalid eye name"
      >
        <span className="text-xs text-semantic-muted dark:text-semantic-muted">
          ?
        </span>
      </div>
    );
  }

  const eyeLower = eye.toLowerCase().trim();

  // Early return if eye name is empty after trimming
  if (!eyeLower) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full ${className}`}
        style={{ width: size, height: size }}
        title="Empty eye name"
      >
        <span className="text-xs text-semantic-muted dark:text-semantic-muted">
          ?
        </span>
      </div>
    );
  }

  const [dbSvg, setDbSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch icon SVG from database (SSOT) - only if not provided via props
  useEffect(() => {
    // Skip fetching if iconSvg is already provided
    if (iconSvg) {
      return;
    }

    const fetchSvg = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/eyes/${eyeLower}/icon`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.data?.iconSvg) {
            setDbSvg(data.data.iconSvg);
          }
        } else if (response.status !== 404) {
          // Only log non-404 errors (network errors, 500s, etc.)
          console.warn(
            `[EyeIcon] Failed to fetch icon for ${eye}: ${response.status}`,
          );
        }
      } catch (error) {
        // Only log actual network errors
        console.debug(
          `[EyeIcon] Network error fetching icon for ${eye}:`,
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSvg();
  }, [eye, eyeLower, iconSvg]);

  // Use provided iconSvg first, then fetched dbSvg
  const svgContent = iconSvg || dbSvg;

  if (svgContent) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  if (loading) {
    // Show loading state
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Return placeholder if no SVG found
  return (
    <div
      className={`inline-flex items-center justify-center bg-brand-paper rounded-full ${className}`}
      style={{ width: size, height: size }}
      title={`Missing icon: ${eye}`}
    >
      <span className="text-xs text-semantic-muted dark:text-semantic-muted">
        ?
      </span>
    </div>
  );
}

/**
 * Get Eye color from theme SSOT
 * Uses SHARED_EYE_COLORS from theme system (no hardcoded colors!)
 */
export function getEyeColor(eye: string): string {
  if (!eye) return METRIC_COLORS.info; // Guard clause for control nodes (Switch, IF, Loop, Terminal)
  const eyeLower = eye.toLowerCase() as keyof typeof SHARED_EYE_COLORS;
  return SHARED_EYE_COLORS[eyeLower] || METRIC_COLORS.info; // Fallback to SSOT info color if eye not found
}

// getEyeName function removed - SSOT violation
// Eye names should come from database via /api/eyes/all endpoint
// Use eye.name from API response instead
