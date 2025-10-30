import Image from 'next/image';
import { EyeIconPaths, getEyeIconPath } from '@third-eye/constants/eye-icons';
import { EyeId } from '@third-eye/constants/taxonomy';
import { SHARED_EYE_COLORS } from '@third-eye/theme';

interface EyeIconProps {
  eye: string;
  size?: number;
  className?: string;
}

/**
 * Eye Icon Component - Uses SSOT SVG paths
 * NO EMOJIS - All icons are SVG assets from /public/eyes/
 */
export function EyeIcon({ eye, size = 24, className = '' }: EyeIconProps) {
  const eyeLower = eye.toLowerCase();

  // Try to get icon path from SSOT
  const iconPath = EyeIconPaths[eyeLower as EyeId] || EyeIconPaths[eyeLower as keyof typeof EyeIconPaths];

  if (!iconPath) {
    // Log error instead of falling back to emoji
    console.error(`[EyeIcon] Missing SVG icon for eye: ${eye}. Please add to /apps/ui/public/eyes/`);

    // Return placeholder SVG icon instead of emoji
    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full ${className}`}
        style={{ width: size, height: size }}
        title={`Missing icon: ${eye}`}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">?</span>
      </div>
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
  return SHARED_EYE_COLORS[eyeLower] || '#64b5f6'; // Fallback to blue if eye not found
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
