'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';

type EyeName = 'sharingan' | 'rinnegan' | 'byakugan' | 'tenseigan' | 'mangekyo' | 'jogan' | 'overseer';

interface PersonaTheme {
  gradient: string;
  accent: string;
  glow: string;
  pattern: string;
  emoji: string;
  voice: string;
}

const PERSONA_THEMES: Record<EyeName, PersonaTheme> = {
  sharingan: {
    gradient: 'from-red-500/20 via-red-600/10 to-transparent',
    accent: 'text-red-400',
    glow: 'shadow-red-500/30',
    pattern: '🔴',
    emoji: '👁️',
    voice: 'Analytical and questioning, seeking clarity',
  },
  rinnegan: {
    gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
    accent: 'text-purple-400',
    glow: 'shadow-purple-500/30',
    pattern: '🌀',
    emoji: '🔮',
    voice: 'Authoritative and decisive, guarding standards',
  },
  byakugan: {
    gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
    accent: 'text-blue-400',
    glow: 'shadow-blue-500/30',
    pattern: '🔵',
    emoji: '👀',
    voice: 'Methodical and thorough, detecting inconsistencies',
  },
  tenseigan: {
    gradient: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
    accent: 'text-cyan-400',
    glow: 'shadow-cyan-500/30',
    pattern: '💫',
    emoji: '✨',
    voice: 'Evidence-focused and precise, validating claims',
  },
  mangekyo: {
    gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    pattern: '⚡',
    emoji: '⚡',
    voice: 'Technical and critical, reviewing code quality',
  },
  jogan: {
    gradient: 'from-pink-500/20 via-pink-600/10 to-transparent',
    accent: 'text-pink-400',
    glow: 'shadow-pink-500/30',
    pattern: '🌸',
    emoji: '🎯',
    voice: 'Strategic and coordinating, routing intelligently',
  },
  overseer: {
    gradient: 'from-yellow-500/20 via-yellow-600/10 to-transparent',
    accent: 'text-yellow-400',
    glow: 'shadow-yellow-500/30',
    pattern: '👑',
    emoji: '👑',
    voice: 'Commanding and orchestrating, overseeing all',
  },
};

interface PersonaVoiceDecoratorProps {
  activeEye?: EyeName | null;
  children: React.ReactNode;
  showBanner?: boolean;
  showFloatingIcon?: boolean;
}

export function PersonaVoiceDecorator({
  activeEye,
  children,
  showBanner = true,
  showFloatingIcon = true,
}: PersonaVoiceDecoratorProps) {
  const [theme, setTheme] = useState<PersonaTheme | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (activeEye) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setTheme(PERSONA_THEMES[activeEye]);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setTheme(null);
    }
  }, [activeEye]);

  return (
    <div className="relative">
      {/* Background Gradient Overlay */}
      <AnimatePresence>
        {theme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`pointer-events-none fixed inset-0 z-0 bg-gradient-radial ${theme.gradient}`}
          />
        )}
      </AnimatePresence>

      {/* Active Eye Banner */}
      <AnimatePresence>
        {showBanner && theme && activeEye && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-full border border-brand-outline/40 bg-brand-paper/90 px-6 py-3 shadow-xl backdrop-blur-md ${theme.glow}`}
          >
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-2xl"
              >
                {theme.emoji}
              </motion.span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold uppercase tracking-wider ${theme.accent}`}>
                    {activeEye}
                  </span>
                  <span className="text-xs text-slate-400">Active</span>
                </div>
                <p className="text-xs text-slate-400">{theme.voice}</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`h-2 w-2 rounded-full ${theme.accent.replace('text-', 'bg-')}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Eye Icon */}
      <AnimatePresence>
        {showFloatingIcon && theme && activeEye && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 bg-brand-paper/90 backdrop-blur-md ${theme.accent.replace('text-', 'border-')} ${theme.glow} shadow-xl`}
            >
              {/* Pulsing Ring */}
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className={`absolute inset-0 rounded-full border-2 ${theme.accent.replace('text-', 'border-')}`}
              />

              <span className="relative text-2xl">{theme.emoji}</span>

              {/* Tooltip */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-full mr-3 whitespace-nowrap rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-xs shadow-lg"
              >
                <span className={`font-semibold uppercase ${theme.accent}`}>{activeEye}</span>
                <span className="ml-2 text-slate-400">is active</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with Persona Styling */}
      <div
        className={`relative z-10 transition-all duration-500 ${
          theme ? `persona-${activeEye}` : ''
        } ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}
      >
        {children}
      </div>

      {/* Decorative Pattern */}
      <AnimatePresence>
        {theme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, ${theme.pattern} 2px, transparent 2px)`,
              backgroundSize: '50px 50px',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to get current persona theme
 */
export function usePersonaTheme(activeEye?: EyeName | null) {
  const [theme, setTheme] = useState<PersonaTheme | null>(null);

  useEffect(() => {
    if (activeEye) {
      setTheme(PERSONA_THEMES[activeEye]);
    } else {
      setTheme(null);
    }
  }, [activeEye]);

  return theme;
}

/**
 * Persona-themed card wrapper
 */
interface PersonaCardProps {
  eye: EyeName;
  children: React.ReactNode;
  className?: string;
}

export function PersonaCard({ eye, children, className = '' }: PersonaCardProps) {
  const theme = PERSONA_THEMES[eye];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border bg-gradient-to-br p-6 ${theme.accent.replace('text-', 'border-')} ${theme.gradient} ${theme.glow} ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{theme.emoji}</span>
        <span className={`text-sm font-bold uppercase tracking-wider ${theme.accent}`}>
          {eye}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

export default PersonaVoiceDecorator;
