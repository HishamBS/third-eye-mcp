import { motion } from 'framer-motion';
import clsx from 'clsx';
import Image from 'next/image';
import type { EyeState } from '../types/pipeline';
import sharinganPng from '../assets/eyes/sharingan.png';
import promptHelperPng from '../assets/eyes/prompt-helper.png';
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
  PROMPT_HELPER: 'Prompt Helper',
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

const eyeColors: Record<string, string> = {
  SHARINGAN: 'border-rose-500/40 bg-rose-500/5',
  PROMPT_HELPER: 'border-purple-500/40 bg-purple-500/5',
  JOGAN: 'border-cyan-500/40 bg-cyan-500/5',
  RINNEGAN_PLAN: 'border-indigo-500/40 bg-indigo-500/5',
  RINNEGAN_REVIEW: 'border-indigo-500/40 bg-indigo-500/5',
  RINNEGAN_FINAL: 'border-indigo-500/40 bg-indigo-500/5',
  MANGEKYO_SCAFFOLD: 'border-red-500/40 bg-red-500/5',
  MANGEKYO_IMPL: 'border-red-500/40 bg-red-500/5',
  MANGEKYO_TESTS: 'border-red-500/40 bg-red-500/5',
  MANGEKYO_DOCS: 'border-red-500/40 bg-red-500/5',
  TENSEIGAN: 'border-blue-500/40 bg-blue-500/5',
  BYAKUGAN: 'border-slate-400/40 bg-slate-400/5',
};

export interface EyeCardProps {
  state: EyeState;
  onClick?: () => void;
}

export default function EyeCard({ state, onClick }: EyeCardProps) {
  const eyeKey = state.eye?.toUpperCase().replace(/\s+/g, '_') || 'SHARINGAN';
  const asset = eyeAssets[eyeKey as keyof typeof eyeAssets];
  const label = eyeLabels[eyeKey] || state.eye || 'Unknown';
  const colorClass = eyeColors[eyeKey] || 'border-slate-500/40 bg-slate-500/5';

  const statusColor = state.ok === true 
    ? 'text-emerald-400' 
    : state.ok === false 
    ? 'text-rose-400' 
    : 'text-slate-400';

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
          <h3 className="text-sm font-semibold text-white truncate">{label}</h3>
          <p className={clsx('text-xs font-medium mt-1', statusColor)}>
            {state.code || (state.ok === true ? 'Approved' : state.ok === false ? 'Blocked' : 'Pending')}
          </p>
          {state.ts && (
            <p className="text-[10px] text-slate-500 mt-1">
              {new Date(state.ts).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
