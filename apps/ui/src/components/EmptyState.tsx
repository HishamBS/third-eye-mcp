'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  illustration?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actions, illustration }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12"
    >
      {/* Icon or Illustration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-6"
      >
        {illustration || (
          <div className="rounded-full bg-gradient-to-br from-brand-accent/20 to-brand-primary/10 p-8">
            <Icon className="h-16 w-16 text-brand-accent" />
          </div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-brand-foreground mb-3 text-center"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-base text-brand-outline mb-8 text-center max-w-md leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3"
        >
          {actions.map((action, index) => {
            const buttonClasses = action.variant === 'secondary'
              ? 'rounded-lg border border-brand-outline/50 bg-brand-paper px-6 py-3 text-sm font-medium text-brand-foreground hover:border-brand-accent hover:bg-brand-paperElev transition-colors'
              : 'rounded-lg bg-brand-accent px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-primary transition-colors shadow-lg shadow-brand-accent/20';

            if (action.href) {
              return (
                <Link key={index} href={action.href} className={buttonClasses}>
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={index}
                onClick={action.onClick}
                className={buttonClasses}
              >
                {action.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
