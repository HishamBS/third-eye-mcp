/**
 * Skeleton Loading Component
 * Provides reusable skeleton loaders for different content types
 */

import { motion } from 'framer-motion';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

const VARIANT_CLASSES = Object.freeze({
  text: 'h-4 rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
  card: 'h-64 rounded-2xl',
});

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: SkeletonProps) {
  const variantClass = VARIANT_CLASSES[variant];

  const skeletonElement = (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={`bg-brand-outline/20 ${variantClass} ${className}`}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{skeletonElement}</div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6 ${className}`}>
      <div className="mb-4 flex justify-center">
        <Skeleton variant="circular" width="64px" height="64px" />
      </div>
      <Skeleton variant="text" className="mx-auto mb-2 w-3/4" />
      <Skeleton variant="text" className="mx-auto mb-4 w-1/2" />
      <Skeleton variant="text" count={3} />
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className = '' }: SkeletonListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-4">
          <div className="flex items-start gap-4">
            <Skeleton variant="circular" width="48px" height="48px" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
