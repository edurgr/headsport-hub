'use client';

import { useEffect, useMemo, useState } from 'react';

type Option = { value: string; label: string };

export default function ResponsiveSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label || '', [options, value]);

  if (!isMobile) {
    return (
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || 'w-full px-3 h-9 border rounded'}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={(className || 'w-full px-3 h-11 border rounded') + ' text-left flex items-center justify-between'}
      >
        <span className={selectedLabel ? '' : 'text-gray-500'}>
          {selectedLabel || placeholder || 'Select'}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium">{ariaLabel || 'Choose an option'}</div>
              <button onClick={() => setOpen(false)} className="text-gray-500">✕</button>
            </div>
            <ul className="py-1">
              {options.map((o) => (
                <li key={o.value}>
                  <button
                    className={`w-full text-left px-4 py-3 text-lg ${o.value === value ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}


