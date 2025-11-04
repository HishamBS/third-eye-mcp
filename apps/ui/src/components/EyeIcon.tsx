import { useEffect, useState } from 'react';
import Image from 'next/image';
import { EyeIconPaths, getEyeIconPath } from '@third-eye/constants/eye-icons';
import { EyeId } from '@third-eye/constants/taxonomy';
import { SHARED_EYE_COLORS } from '@third-eye/theme';
import { API_BASE_URL } from '@/consts/api';
import { METRIC_COLORS } from '@/constants/design-tokens';

interface EyeIconProps {
  eye: string;
  size?: number;
  className?: string;
  customSvg?: string; // Direct SVG content (optional)
}

/**
 * Eye Icon Component - Uses SSOT SVG paths OR database SVG content
 * NO EMOJIS - All icons are SVG assets or inline SVG content
 *
 * Priority:
 * 1. customSvg prop (if provided)
 * 2. Database SVG (fetched via API) - ONLY for custom eyes without default icons
 * 3. Default SVG from /public/eyes/
 */
export function EyeIcon({ eye, size = 24, className = '', customSvg }: EyeIconProps) {
  // Early return if eye name is invalid
  if (!eye || typeof eye !== 'string') {
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full ${className}`}
        style={{ width: size, height: size }}
        title="Invalid eye name"
      >
        <span className="text-xs text-semantic-muted dark:text-semantic-muted">?</span>
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
        <span className="text-xs text-semantic-muted dark:text-semantic-muted">?</span>
      </div>
    );
  }

  // Check if default icon exists FIRST
  const hasDefaultIcon = EyeIconPaths[eyeLower as EyeId] !== undefined;
  
  const [dbSvg, setDbSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only fetch from DB if:
  // 1. No customSvg prop provided
  // 2. No default icon exists (custom eye)
  // This prevents 404s for built-in eyes (overseer, sharingan, etc.)
  useEffect(() => {
    if (customSvg || hasDefaultIcon) return; // Skip fetch if we have default or custom SVG

    const fetchSvg = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/eyes/${eyeLower}/icon`);
        if (response.ok) {
          const data = await response.json();
          if (data.data?.iconSvg) {
            setDbSvg(data.data.iconSvg);
          }
        } else if (response.status !== 404) {
          // Only log non-404 errors (network errors, 500s, etc.)
          console.warn(`[EyeIcon] Failed to fetch icon for ${eye}: ${response.status}`);
        }
        // 404 is expected for custom eyes without icons - silent fail
      } catch (error) {
        // Only log actual network errors
        console.debug(`[EyeIcon] Network error fetching icon for ${eye}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchSvg();
  }, [eye, eyeLower, customSvg, hasDefaultIcon]);

  // Use custom SVG if available (prop > database > default)
  const svgContent = customSvg || dbSvg;

  if (svgContent) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  // Try to get default icon path from SSOT
  const iconPath = EyeIconPaths[eyeLower as EyeId] || EyeIconPaths[eyeLower as keyof typeof EyeIconPaths];

  if (!iconPath && !loading) {
    // Return placeholder if no SVG found
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full ${className}`}
        style={{ width: size, height: size }}
        title={`Missing icon: ${eye}`}
      >
        <span className="text-xs text-semantic-muted dark:text-semantic-muted">?</span>
      </div>
    );
  }

  if (loading || !iconPath) {
    // Show loading state
    return (
      <div
        className={`inline-flex items-center justify-center bg-brand-paper rounded-full animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={iconPath}
      alt={`${eye} eye`}
      width={size}
      height={size}
      className={className}
    />
  );
}

/**
 * Get Eye color from theme SSOT
 * Uses SHARED_EYE_COLORS from theme system (no hardcoded colors!)
 */
export function getEyeColor(eye: string): string {
  const eyeLower = eye.toLowerCase() as keyof typeof SHARED_EYE_COLORS;
  return SHARED_EYE_COLORS[eyeLower] || METRIC_COLORS.info; // Fallback to SSOT info color if eye not found
}

// Helper function to get eye name
export function getEyeName(eye: string): string {
  const names: Record<string, string> = {
    sharingan: 'Sharingan',
    rinnegan: 'Rinnegan',
    byakugan: 'Byakugan',
    jogan: 'Jōgan',
    tenseigan: 'Tenseigan',
    mangekyo: 'Mangekyō Sharingan',
    overseer: 'Overseer',
  };
  return names[eye.toLowerCase()] || eye;
}
