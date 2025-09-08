'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

interface DownloadContextType {
  isActive: boolean;
  label: string;
  progressPct: number; // 0..100
  total: number;
  current: number;
  begin: (label: string, total?: number) => void;
  setProgress: (current: number, total?: number) => void;
  step: (increment?: number) => void;
  end: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [label, setLabel] = useState('');
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);

  const progressPct =
    total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : isActive ? 10 : 0;

  const api = useMemo<DownloadContextType>(
    () => ({
      isActive,
      label,
      progressPct,
      total,
      current,
      begin: (lbl: string, tot?: number) => {
        setIsActive(true);
        setLabel(lbl || 'Downloading…');
        setTotal(Math.max(0, tot || 0));
        setCurrent(0);
      },
      setProgress: (cur: number, tot?: number) => {
        if (typeof tot === 'number') setTotal(Math.max(0, tot));
        setCurrent(Math.max(0, cur));
        setIsActive(true);
      },
      step: (inc = 1) => {
        setCurrent(prev => Math.max(0, prev + inc));
        setIsActive(true);
      },
      end: () => {
        setCurrent(prev => (total > 0 ? total : prev));
        setTimeout(() => {
          setIsActive(false);
          setLabel('');
          setTotal(0);
          setCurrent(0);
        }, 600);
      },
    }),
    [isActive, label, progressPct, total, current]
  );

  return <DownloadContext.Provider value={api}>{children}</DownloadContext.Provider>;
}

export function useDownload(): DownloadContextType {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within a DownloadProvider');
  return ctx;
}
