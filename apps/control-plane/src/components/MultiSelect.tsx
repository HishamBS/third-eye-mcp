import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { OptionItem } from '../types/admin';

export interface MultiSelectProps {
  value: string[];
  options: OptionItem[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  busy?: boolean;
  emptyLabel?: string;
}

function normalise(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length ? trimmed : null;
}

export function MultiSelect({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  allowCustom = false,
  busy = false,
  emptyLabel = 'No options available',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = Array.isArray(value) ? value : [];
  const optionMap = useMemo(() => new Map(options.map((item) => [item.value, item])), [options]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const lowered = query.toLowerCase();
    return options.filter((item) =>
      [item.value, item.label, item.description, item.group]
        .filter(Boolean)
        .some((token) => token!.toLowerCase().includes(lowered)),
    );
  }, [options, query]);

  const toggle = (nextValue: string) => {
    const normalised = nextValue.trim();
    if (!normalised) return;
    const exists = selected.includes(normalised);
    if (exists) {
      onChange(selected.filter((item) => item !== normalised));
    } else {
      onChange([...selected, normalised]);
    }
  };

  const commitCustom = () => {
    if (!allowCustom) return;
    const candidate = normalise(query);
    if (!candidate) return;
    setQuery('');
    if (!selected.includes(candidate)) {
      onChange([...selected, candidate]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-surface-outline/60 bg-surface-base px-3 py-2 text-left text-sm text-slate-100 transition hover:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40 disabled:opacity-50"
      >
        <span className="truncate">
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-surface-outline/60 bg-surface-raised/90 p-3 shadow-xl">
          <div className="flex items-center gap-2 rounded-lg border border-surface-outline/50 bg-surface-base px-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (allowCustom && query) {
                    commitCustom();
                  }
                }
              }}
              placeholder="Search options..."
              className="w-full bg-transparent py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              disabled={disabled}
            />
            {query && allowCustom && (
              <button
                type="button"
                className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs text-accent-primary transition hover:bg-accent-primary/30"
                onClick={commitCustom}
              >
                Add
              </button>
            )}
          </div>

          <div className="mt-3 max-h-56 overflow-y-auto">
            {busy ? (
              <p className="px-2 py-3 text-xs text-slate-400">Loading options…</p>
            ) : filteredOptions.length ? (
              filteredOptions.map((item) => {
                const checked = selected.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className="group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 transition hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.value)}
                      className="mt-1 h-4 w-4 rounded border border-surface-outline/50 bg-surface-base accent-accent-primary"
                    />
                    <span>
                      <span className="font-medium text-white">{item.label || item.value}</span>
                      {(item.description || item.group) && (
                        <Fragment>
                          <br />
                          <span className="text-xs text-slate-400">
                            {[item.group, item.description].filter(Boolean).join(' • ')}
                          </span>
                        </Fragment>
                      )}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="px-2 py-3 text-xs text-slate-500">{allowCustom && query ? 'Press Enter to add this value' : emptyLabel}</p>
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-surface-outline/60 bg-surface-raised/60 px-2 py-1 text-xs text-slate-200"
            >
              <span>{optionMap.get(item)?.label ?? item}</span>
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full bg-surface-base/50 px-1 text-[10px] text-slate-300 transition hover:bg-surface-base hover:text-white"
                  onClick={() => toggle(item)}
                  aria-label={`Remove ${item}`}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
