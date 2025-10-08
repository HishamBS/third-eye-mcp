/**
 * useDialog Hook - Modal dialogs to replace alert() and confirm()
 */

'use client';

import * as React from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface DialogStore extends DialogState {
  open: (config: Omit<DialogState, 'isOpen'>) => void;
  close: () => void;
}

const useDialogStore = create<DialogStore>((set) => ({
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
  open: (config) => set({ ...config, isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function useDialog() {
  const store = useDialogStore();

  const alert = (title: string, message: string) => {
    return new Promise<void>((resolve) => {
      store.open({
        type: 'alert',
        title,
        message,
        confirmText: 'OK',
        onConfirm: () => {
          store.close();
          resolve();
        },
      });
    });
  };

  const confirm = (title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel') => {
    return new Promise<boolean>((resolve) => {
      store.open({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          store.close();
          resolve(true);
        },
        onCancel: () => {
          store.close();
          resolve(false);
        },
      });
    });
  };

  const prompt = (title: string, message: string, defaultValue = '', confirmText = 'OK', cancelText = 'Cancel') => {
    return new Promise<string | null>((resolve) => {
      store.open({
        type: 'prompt',
        title,
        message,
        defaultValue,
        confirmText,
        cancelText,
        onConfirm: (value) => {
          store.close();
          resolve(value || null);
        },
        onCancel: () => {
          store.close();
          resolve(null);
        },
      });
    });
  };

  return { alert, confirm, prompt };
}

/**
 * DialogProvider Component - Must be added to layout
 */
export function DialogProvider() {
  const { isOpen, type, title, message, defaultValue, onConfirm, onCancel, confirmText, cancelText, close } = useDialogStore();
  const [inputValue, setInputValue] = React.useState(defaultValue || '');

  React.useEffect(() => {
    setInputValue(defaultValue || '');
  }, [defaultValue]);

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm?.(inputValue);
    } else {
      onConfirm?.();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-brand-outline/60 bg-brand-paperElev p-6 shadow-2xl"
              onKeyDown={handleKeyDown}
            >
              {/* Title */}
              {title && (
                <h3 className="mb-4 text-xl font-semibold text-white">
                  {title}
                </h3>
              )}

              {/* Message */}
              <p className="mb-6 text-slate-300">
                {message}
              </p>

              {/* Prompt Input */}
              {type === 'prompt' && (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                  className="mb-6 w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  placeholder="Enter value..."
                />
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                {type !== 'alert' && (
                  <button
                    onClick={handleCancel}
                    className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                  >
                    {cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  autoFocus={type !== 'prompt'}
                  className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                >
                  {confirmText || 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

