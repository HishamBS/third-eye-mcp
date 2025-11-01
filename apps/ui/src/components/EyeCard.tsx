import { motion } from 'framer-motion';
import clsx from 'clsx';
import Image from 'next/image';
import type { EyeState } from '../types/pipeline';
import sharinganPng from '../assets/eyes/sharingan.png';
import promptHelperPng from '../assets/eyes/kyuubi.png';
import joganPng from '../assets/eyes/jogan.png';
import rinneganPng from '../assets/eyes/rinnegan.png';
import mangekyoPng from '../assets/eyes/mangekyo.png';
import tenseiganPng from '../assets/eyes/tenseigan.png';
import byakuganPng from '../assets/eyes/byakugan.png';

const eyeAssets = {
  SHARINGAN: sharinganPng,
  PROMPT_HELPER: promptHelperPng,
  JOGAN: joganPng,
  RINNEGAN_PLAN: rinneganPng,
  RINNEGAN_REVIEW: rinneganPng,
  RINNEGAN_FINAL: rinneganPng,
  MANGEKYO_SCAFFOLD: mangekyoPng,
  MANGEKYO_IMPL: mangekyoPng,
  MANGEKYO_TESTS: mangekyoPng,
  MANGEKYO_DOCS: mangekyoPng,
  TENSEIGAN: tenseiganPng,
  BYAKUGAN: byakuganPng,
};

const eyeLabels: Record<string, string> = {
  SHARINGAN: 'Sharingan',
  PROMPT_HELPER: 'Kyuubi',
  JOGAN: 'Jōgan',
  RINNEGAN_PLAN: 'Rinnegan · Plan',
  RINNEGAN_REVIEW: 'Rinnegan · Review',
  RINNEGAN_FINAL: 'Rinnegan · Final',
  MANGEKYO_SCAFFOLD: 'Mangekyō · Scaffold',
  MANGEKYO_IMPL: 'Mangekyō · Impl',
  MANGEKYO_TESTS: 'Mangekyō · Tests',
  MANGEKYO_DOCS: 'Mangekyō · Docs',
  TENSEIGAN: 'Tenseigan',
  BYAKUGAN: 'Byakugan',
};

/**
 * Maps eye type keys to their corresponding eye color tokens from theme
 * Uses eye color tokens with opacity modifiers for borders and backgrounds
 */
function getEyeColorClasses(eyeKey: string): string {
  const eyeTypeMap: Record<string, string> = {
    SHARINGAN: 'sharingan',
    PROMPT_HELPER: 'kyuubi',
    JOGAN: 'jogan',
    RINNEGAN_PLAN: 'rinnegan',
    RINNEGAN_REVIEW: 'rinnegan',
    RINNEGAN_FINAL: 'rinnegan',
    MANGEKYO_SCAFFOLD: 'mangekyo',
    MANGEKYO_IMPL: 'mangekyo',
    MANGEKYO_TESTS: 'mangekyo',
    MANGEKYO_DOCS: 'mangekyo',
    TENSEIGAN: 'tenseigan',
    BYAKUGAN: 'byakugan',
  };

  const eyeType = eyeTypeMap[eyeKey];
  if (!eyeType) {
    return 'border-brand-outline/40 bg-brand-paper-elev/5';
  }

  return `border-eye-${eyeType}/40 bg-eye-${eyeType}/5`;
}

export interface EyeCardProps {
  state: EyeState;
  onClick?: () => void;
}

export default function EyeCard({ state, onClick }: EyeCardProps) {
  const eyeKey = state.eye?.toUpperCase().replace(/\s+/g, '_') || 'SHARINGAN';
  const asset = eyeAssets[eyeKey as keyof typeof eyeAssets];
  const label = eyeLabels[eyeKey] || state.eye || 'Unknown';
  const colorClass = getEyeColorClasses(eyeKey);

  const statusColor = state.ok === true
    ? 'text-semantic-success'
    : state.ok === false
    ? 'text-semantic-error'
    : 'text-brand-outline';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:shadow-lg',
        colorClass,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start gap-3">
        {asset && (
          <div className="relative h-12 w-12 flex-shrink-0">
            <Image
              src={asset}
              alt={label}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-brand-foreground truncate">{label}</h3>
          <p className={clsx('text-xs font-medium mt-1', statusColor)}>
            {state.code || (state.ok === true ? 'Approved' : state.ok === false ? 'Blocked' : 'Pending')}
          </p>
          {state.ts && (
            <p className="text-[10px] text-brand-outline mt-1">
              {new Date(state.ts).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
