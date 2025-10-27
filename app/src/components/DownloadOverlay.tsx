'use client';

import { useDownload } from '@/contexts/DownloadContext';

export default function DownloadOverlay() {
  const { isActive, label, progressPct } = useDownload();
  if (!isActive) return null;
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-[90%] max-w-md rounded-xl shadow-lg p-5"
        style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="mb-3 text-center font-medium" style={{ color: 'hsl(var(--foreground))' }}>
          {label || 'Downloading…'}
        </div>
        <div className="relative w-full h-3 rounded-full overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-black via-gray-900 to-black shadow-[0_0_18px_rgba(0,0,0,0.35)] transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-[left] duration-150 ease-linear"
            style={{ left: `calc(${Math.max(0, Math.min(100, progressPct))}% - 4px)` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 text-center text-xs" style={{ color: 'hsl(var(--muted))' }}>
          {Math.round(progressPct)}%
        </div>
      </div>
    </div>
  );
}







