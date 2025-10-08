import Image from 'next/image';

interface EyeIconProps {
  eye: string;
  size?: number;
  className?: string;
}

const EYE_ICONS: Record<string, string> = {
  sharingan: '/eyes/sharingan.svg',
  rinnegan: '/eyes/rinnegan.svg',
  byakugan: '/eyes/byakugan.svg',
  jogan: '/eyes/jogan.svg',
  tenseigan: '/eyes/tenseigan.svg',
  mangekyo: '/eyes/mangekyo.svg',
  overseer: '/eyes/overseer.svg',
};

// Fallback emoji mapping
const EYE_EMOJI: Record<string, string> = {
  sharingan: '👁️',
  rinnegan: '🔮',
  byakugan: '👀',
  jogan: '⚡',
  tenseigan: '✨',
  mangekyo: '🌀',
  overseer: '🧿',
};

export function EyeIcon({ eye, size = 24, className = '' }: EyeIconProps) {
  const iconPath = EYE_ICONS[eye.toLowerCase()];

  if (iconPath) {
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

  // Fallback to emoji if SVG not found
  return (
    <span className={className} style={{ fontSize: size }}>
      {EYE_EMOJI[eye.toLowerCase()] || '👁️'}
    </span>
  );
}

// Helper function to get eye color for styling
export function getEyeColor(eye: string): string {
  const colors: Record<string, string> = {
    sharingan: '#ff0000',
    rinnegan: '#9b59b6',
    byakugan: '#e8e8f0',
    jogan: '#00d4ff',
    tenseigan: '#ffd700',
    mangekyo: '#cc0000',
    overseer: '#6644cc',
  };
  return colors[eye.toLowerCase()] || '#64b5f6';
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
