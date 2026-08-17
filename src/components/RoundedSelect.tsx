import React, { useEffect, useRef, useState } from 'react';

interface RoundedSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function RoundedSelect<T extends string>({ value, options, onChange, ariaLabel, className = '', placeholder = 'Select an option', disabled = false }: RoundedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const effectivePlaceholder = options.length === 0 ? `No ${ariaLabel.toLowerCase()} available` : placeholder;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!isOpen || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setOpenAbove(rect.bottom + Math.min(256, window.innerHeight - 32) > window.innerHeight);
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={isOpen} disabled={disabled} onClick={() => setIsOpen((open) => !open)} className="input-field flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed">
        <span className={`truncate ${selected || value ? 'text-on-surface' : 'text-on-surface-variant'}`}>{selected?.label ?? (value || effectivePlaceholder)}</span>
        <span className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <div role="listbox" aria-label={ariaLabel} className={`absolute left-0 right-0 z-50 max-h-[min(16rem,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-border-light bg-surface-container-lowest p-1.5 shadow-xl ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {options.length === 0 && <div className="px-3 py-2.5 text-xs text-on-surface-variant">No options available</div>}
          {options.map((option) => (
            <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setIsOpen(false); }} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${option.value === value ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
