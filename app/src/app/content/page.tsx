'use client';

import { useEffect, useState, useCallback } from 'react'; // Import useCallback

import Image from 'next/image';

import { Upload as UploadIcon } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Toast } from '@/components/toast';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { useDownload } from '@/contexts/DownloadContext';
import { supabaseClient } from '@/lib/supabase-client';

interface GalleryItem {
  id: string;
  filename: string;
  mime_type: string | null;
  file_type: 'image' | 'video' | 'document' | 'other';
  file_size: number | null;
  created_at: string;
  url: string | null;
  thumbnail_url?: string | null;
  metadata?: { title?: string; tags?: string[] } | null;
  author: string;
  session_title: string | null;
  author_id?: string | null;
}

export default function ContentPage() {
  const download = useDownload();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [role, setRole] = useState<'athlete' | 'manager' | 'admin'>('athlete');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [confirmCount, setConfirmCount] = useState('');
  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<GalleryItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [tableSort, setTableSort] = useState<{
    key: 'created_at' | 'filename' | 'file_size' | 'file_type' | 'rating';
    dir: 'asc' | 'desc';
  }>({ key: 'created_at', dir: 'desc' });
  const [tableFilter, setTableFilter] = useState<{
    type: 'all' | 'image' | 'video' | 'document' | 'other';
  }>({ type: 'all' });
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: 'success' | 'error' | 'info' }[]>([]);

  const openViewer = (list: GalleryItem[], startId: string) => {
    const idx = list.findIndex((it) => it.id === startId);
    setViewerItems(list);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const prevViewer = () => setViewerIndex((i) => (i - 1 + viewerItems.length) % viewerItems.length);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerItems.length);

  // Selection helpers
  const getDisplayedItems = useCallback((): GalleryItem[] => { // CORREGIDO: useCallback añadido
    if (viewMode === 'grid') {
      return activeAuthorId ? items.filter((it) => it.author_id === activeAuthorId) : items;
    }
    // Table mode: apply same filter and sort used by the table
    const base = activeAuthorId ? items.filter((it) => it.author_id === activeAuthorId) : items;
    const filtered =
      tableFilter.type === 'all' ? base : base.filter((it) => it.file_type === tableFilter.type);
    const sorted = [...filtered].sort((a, b) => {
      // NOTE: Original sort direction was always descending (-1). Keeping it for now.
      const dir = tableSort.dir === 'asc' ? 1 : -1;
      switch (tableSort.key) {
        case 'filename':
          return a.filename.localeCompare(b.filename) * dir;
        case 'file_size':
          return ((a.file_size || 0) - (b.file_size || 0)) * dir;
        case 'file_type':
          return a.file_type.localeCompare(b.file_type) * dir;
        case 'rating':
          // Ensure metadata exists and has rating, default to 0
          const ratingA = (a.metadata as any)?.rating || 0;
          const ratingB = (b.metadata as any)?.rating || 0;
          return (ratingA - ratingB) * dir;
        case 'created_at':
        default:
          return (
            (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
          );
      }
    });
    return sorted;
  }, [viewMode, activeAuthorId, items, tableFilter.type, tableSort.key, tableSort.dir]); // CORREGIDO: Dependencias añadidas

  const toggleMasterForDisplayed = useCallback((checked: boolean) => { // CORREGIDO: useCallback añadido
    const displayed = getDisplayedItems();
    const displayedIds = new Set(displayed.map((it) => it.id));
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      if (checked) {
        displayed.forEach((it) => {
          next[it.id] = true;
        });
      } else {
        displayedIds.forEach((id) => {
          if (id in next) delete next[id];
        });
      }
      return next;
    });
  }, [getDisplayedItems]); // CORREGIDO: Dependencia añadida

  const selectAllForAuthor = (authorId: string) => {
    const list = items.filter((it) => it.author_id === authorId);
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      list.forEach((it) => (next[it.id] = true));
      return next;
    });
  };

  const getSelectedIds = () => Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);
  const selectedCount = getSelectedIds().length;

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const isMetaA = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a';
      if (isMetaA) {
        e.preventDefault();
        toggleMasterForDisplayed(true);
        addToast('All visible items selected', 'info');
        return;
      }
      if (e.key === 'Escape') {
        toggleMasterForDisplayed(false);
        addToast('Selection cleared', 'info');
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCount > 0 && (role === 'admin' || role === 'manager')) {
        e.preventDefault();
        setShowDeleteSelectedModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCount, role, toggleMasterForDisplayed]); // CORREGIDO: toggleMasterForDisplayed añadido

  async function downloadFromSignedUrls(entries: { url: string; filename: string }[]) {
    const total = entries.length || 1;
    download.begin('Preparing downloads…', total);
    let done = 0;
    for (const entry of entries) {
      try {
        const resp = await fetch(entry.url);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = entry.filename || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error('Download failed for', entry.filename, e);
      } finally {
        done += 1;
        download.setProgress(done, total);
      }
    }
    download.end();
  }

  useEffect(() => {
    const fetchItems = async () => {
      try {
        console.log('=== FETCHING GALLERY DATA ===');
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData.session?.user || null;
        const token = sessionData.session?.access_token;
        console.log('Session token:', token ? 'present' : 'missing');

        // Fetch user role
        let userRole: 'athlete' | 'manager' | 'admin' = 'athlete'; // Renamed to avoid conflict
        if (user) {
          const { data: prof } = await supabaseClient
            .from('profiles')
            .select('role,name')
            .eq('id', user.id)
            .single();
          if (prof?.role) userRole = prof.role;
        }
        setRole(userRole);

        // Athlete: fetch directly from Supabase with RLS and sign URLs client-side
        if (userRole === 'athlete') {
          console.log('Fetching content client-side for athlete');
          const { data: files, error } = await supabaseClient
            .from('upload_files')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;

          const sessionIds = Array.from(new Set((files || []).map((f) => f.session_id)));
          const { data: sessions } = await supabaseClient
            .from('upload_sessions')
            .select('id,user_id,title,created_at')
            .in('id', sessionIds);

          const sessionMap = new Map<string, any>();
          (sessions || []).forEach((s) => sessionMap.set(s.id, s));

          const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

          const itemsLocal: GalleryItem[] = await Promise.all(
            (files || []).map(async (f) => {
              const session = sessionMap.get(f.session_id);
              const authorName = session ? '' : ''; // Logic for author name seems incomplete
              let url: string | null = null;
              let thumbnail_url: string | null = null;

              try {
                const { data } = await supabaseClient.storage
                  .from(String(bucket))
                  .createSignedUrl(f.file_path, 60 * 60);
                url = data?.signedUrl || null;
              } catch {}
              if (f.thumbnail_path) {
                try {
                  const { data } = await supabaseClient.storage
                    .from(String(bucket))
                    .createSignedUrl(f.thumbnail_path, 60 * 60);
                  thumbnail_url = data?.signedUrl || null;
                } catch {}
              }

              return {
                id: f.id,
                filename: f.filename,
                mime_type: f.mime_type,
                file_type: f.file_type,
                file_size: f.file_size,
                created_at: f.created_at,
                url,
                thumbnail_url,
                metadata: (f as any).metadata || null,
                author: authorName || '',
                session_title: session?.title || null,
                author_id: session?.user_id || user?.id || null,
              } as GalleryItem;
            }),
          );

          setItems(itemsLocal);
          console.log('Items set (client athlete):', itemsLocal.length);
        } else {
          // Manager/Admin: use API (server signs URLs with admin client)
          const res = await fetch('/api/content/gallery', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: 'no-store',
            redirect: 'follow',
          });
          console.log('API response status:', res.status);
          const data = await res.json();
          console.log('API response data:', data);
          console.log('First item details:', data.items?.[0]);
          setItems(data.items || []);
          console.log('Items set:', data.items?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []); // Initial fetch runs only once

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setEditTitle(item.metadata?.title || '');
    setEditTags((item.metadata?.tags || []).join(', '));
    setThumbFile(null);
    setEditDescription((item.metadata as any)?.description || '');
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const saveEdit = async () => {
    if (!editing) return;
    try {
      let thumbnail_base64: string | undefined;
      if (thumbFile) thumbnail_base64 = await toBase64(thumbFile);
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/content/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          title: editTitle || undefined,
          tags,
          thumbnail_base64,
          description: editDescription || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Failed to save');
        return;
      }
      // Refresh list using the same logic as on mount
      // NOTE: This re-fetches everything. A more efficient way would be to update the item in state.
      setIsLoading(true);
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData.session?.user || null;
        const token = sessionData.session?.access_token;
        let userRole: 'athlete' | 'manager' | 'admin' = 'athlete'; // Renamed
        if (user) {
          const { data: prof } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (prof?.role) userRole = prof.role;
        }
        if (userRole === 'athlete') {
          const { data: files } = await supabaseClient
            .from('upload_files')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          const sessionIds = Array.from(new Set((files || []).map((f) => f.session_id)));
          const { data: sessions } = await supabaseClient
            .from('upload_sessions')
            .select('id,user_id,title,created_at')
            .in('id', sessionIds);
          const sessionMap = new Map<string, any>();
          (sessions || []).forEach((s) => sessionMap.set(s.id, s));
          const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';
          const itemsLocal: GalleryItem[] = await Promise.all(
            (files || []).map(async (f) => {
              const session = sessionMap.get(f.session_id);
              let url: string | null = null;
              let thumbnail_url: string | null = null;
              try {
                const { data } = await supabaseClient.storage
                  .from(String(bucket))
                  .createSignedUrl(f.file_path, 60 * 60);
                url = data?.signedUrl || null;
              } catch {}
              if (f.thumbnail_path) {
                try {
                  const { data } = await supabaseClient.storage
                    .from(String(bucket))
                    .createSignedUrl(f.thumbnail_path, 60 * 60);
                  thumbnail_url = data?.signedUrl || null;
                } catch {}
              }
              return {
                id: f.id,
                filename: f.filename,
                mime_type: f.mime_type,
                file_type: f.file_type,
                file_size: f.file_size,
                created_at: f.created_at,
                url,
                thumbnail_url,
                metadata: (f as any).metadata || null,
                author: '',
                session_title: session?.title || null,
              } as GalleryItem;
            }),
          );
          setItems(itemsLocal);
        } else {
          const listRes = await fetch('/api/content/gallery', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: 'no-store',
            redirect: 'follow',
          });
          const list = await listRes.json();
          console.log('Gallery API response:', list);
          setItems(list.items || []);
        }
      } finally {
        setIsLoading(false);
      }
      setEditing(null);
    } catch {
      alert('Failed to save');
    }
  };

  return (
    <ProtectedRoute>
      <style jsx>{`
        /* Styles remain unchanged */
        .mobile-scroll {
          -webkit-overflow-scrolling: touch;
          overflow-x: auto;
          scrollbar-width: auto;
          -ms-overflow-style: auto;
          position: relative;
        }
        .mobile-scroll::-webkit-scrollbar {
          height: 8px;
          background: transparent;
        }
        .mobile-scroll::-webkit-scrollbar-track {
          background: hsl(var(--border));
          border-radius: 4px;
        }
        .mobile-scroll::-webkit-scrollbar-thumb {
          background: hsl(var(--foreground) / 0.35);
          border-radius: 4px;
        }
        .mobile-scroll::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--foreground) / 0.5);
        }

        /* Forzar scrollbar visible en móviles */
        @media (max-width: 768px) {
          .mobile-scroll {
            overflow-x: scroll !important;
            padding-bottom: 25px;
            margin-bottom: -25px;
          }
          .mobile-scroll::-webkit-scrollbar {
            height: 22px !important;
            background: hsl(var(--secondary)) !important;
            border-radius: 11px !important;
            display: block !important;
          }
          .mobile-scroll::-webkit-scrollbar-track {
            background: hsl(var(--secondary)) !important;
            border-radius: 11px !important;
            border: 3px solid hsl(var(--secondary)) !important;
            display: block !important;
          }
          .mobile-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--foreground) / 0.35) !important;
            border-radius: 11px !important;
            border: 5px solid hsl(var(--secondary)) !important;
            min-width: 50px !important;
            display: block !important;
          }
          .mobile-scroll::-webkit-scrollbar-thumb:active {
            background: hsl(var(--foreground) / 0.5) !important;
          }
        }

        /* Para pantallas de 624px y menores */
        @media (max-width: 624px) {
          .mobile-scroll {
            overflow-x: scroll !important;
            padding-bottom: 30px;
            margin-bottom: -30px;
          }
          .mobile-scroll::-webkit-scrollbar {
            height: 25px !important;
            background: hsl(var(--secondary)) !important;
            border-radius: 12px !important;
            display: block !important;
          }
          .mobile-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--foreground) / 0.4) !important;
            min-width: 60px !important;
            border: 6px solid hsl(var(--secondary)) !important;
          }
        }

        /* Para pantallas muy pequeñas (330px y similares) */
        @media (max-width: 400px) {
          .mobile-scroll {
            overflow-x: scroll !important;
            padding-bottom: 35px;
            margin-bottom: -35px;
          }
          .mobile-scroll::-webkit-scrollbar {
            height: 30px !important;
            background: hsl(var(--border)) !important;
            border-radius: 15px !important;
            display: block !important;
          }
          .mobile-scroll::-webkit-scrollbar-track {
            background: hsl(var(--border)) !important;
            border-radius: 15px !important;
            border: 4px solid hsl(var(--secondary)) !important;
          }
          .mobile-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--foreground) / 0.45) !important;
            border-radius: 15px !important;
            border: 7px solid hsl(var(--secondary)) !important;
            min-width: 70px !important;
          }
        }
      `}</style>
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        {/* Mobile primary CTA */}
        <div className="sm:hidden mb-4">
          <a
            href="/content/upload"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-black text-white rounded-xl hover:opacity-90 active:opacity-80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800"
            aria-label="Upload content"
          >
            <UploadIcon className="h-5 w-5" />
            <span className="text-base">Upload content</span>
          </a>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))]">
              {role !== 'athlete' && activeAuthorId
                ? `Content — ${items.find((i) => i.author_id === activeAuthorId)?.author || 'Unknown'}`
                : 'Content'}
            </h1>

            {/* Back to Athletes button - next to title when inside athlete view */}
            {role !== 'athlete' && activeAuthorId && (
              <button
                onClick={() => setActiveAuthorId(null)}
                className="px-3 py-2 rounded-md transition-colors text-sm"
                style={{
                  backgroundColor: 'hsl(var(--secondary))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                ← Back to Athletes
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <a href="/content/upload" className="btn inline-flex items-center gap-2">
                <UploadIcon className="h-4 w-4" />
                Upload Content
              </a>
            </div>

            {/* Download Selected button - only show when items are selected */}
            {Object.values(selected).some(Boolean) && (
              <button
                onClick={async () => {
                  const ids = Object.entries(selected)
                    .filter(([_, v]) => v)
                    .map(([k]) => k);
                  const { data: sessionData } = await supabaseClient.auth.getSession();
                  const token = sessionData.session?.access_token;
                  const resp = await fetch('/api/content/download', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ file_ids: ids }),
                  });
                  const j = await resp.json();
                  if (j.urls && Array.isArray(j.urls)) {
                    await downloadFromSignedUrls(
                      j.urls.map((u: any) => ({ url: u.url, filename: u.filename })),
                    );
                  }
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Download Selected ({Object.values(selected).filter(Boolean).length})
              </button>
            )}

            {/* Selection helpers */}
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMasterForDisplayed(true)}
                  className="px-3 py-2 rounded-md text-sm"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  Select all {activeAuthorId ? '(athlete)' : ''}
                </button>
                {Object.values(selected).some(Boolean) && (
                  <button
                    onClick={() => toggleMasterForDisplayed(false)}
                    className="px-3 py-2 rounded-md text-sm"
                    style={{
                      backgroundColor: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}

            {/* Delete controls for admin and manager (bulk delete selected) */}
            {(role === 'admin' || role === 'manager') && (
              <div className="flex items-center gap-2">
                {Object.values(selected).some(Boolean) && (
                  <button
                    disabled={deleting}
                    onClick={async () => { // Simplified - using modal now
                      setShowDeleteSelectedModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    {deleting ? 'Deleting…' : `Delete Selected (${Object.values(selected).filter(Boolean).length})`}
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    disabled={deleting}
                    onClick={() => setShowDeleteAllModal(true)}
                    className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors text-sm"
                  >
                    Delete ALL
                  </button>
                )}
              </div>
            )}

            <div
              className="inline-flex rounded-md overflow-hidden"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-[hsl(var(--border))]' : 'bg-[hsl(var(--secondary))]'}`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm border-l ${viewMode === 'table' ? 'bg-[hsl(var(--border))]' : 'bg-[hsl(var(--secondary))]'}`}
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Grouped view for managers/admins */}
            {role !== 'athlete' && !activeAuthorId ? (
              (() => {
                const groups = new Map<
                  string,
                  { author_id: string; author: string; count: number; latest?: GalleryItem }
                >();
                for (const it of items) {
                  const key = it.author_id || 'unknown';
                  const g = groups.get(key) || {
                    author_id: key,
                    author: it.author || 'Unknown',
                    count: 0,
                  };
                  g.count += 1;
                  if (!g.latest || new Date(it.created_at) > new Date(g.latest.created_at))
                    g.latest = it;
                  groups.set(key, g);
                }
                const groupList = Array.from(groups.values());
                return (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {groupList.map((g) => (
                      <div key={g.author_id} className="card overflow-hidden">
                        <div
                          className="aspect-video flex items-center justify-center relative"
                          style={{ backgroundColor: 'hsl(var(--secondary))' }}
                        >
                          {(() => {
                            const latest = g.latest;
                            if (!latest)
                              return (
                                <div className="text-[hsl(var(--muted))] text-sm">No preview</div>
                              );
                            if (
                              latest.file_type === 'image' &&
                              (latest.thumbnail_url || latest.url)
                            ) {
                              return (
                                <Image
                                  src={latest.thumbnail_url || latest.url || ''}
                                  alt={g.author}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                />
                              );
                            }
                            if (latest.file_type === 'video' && latest.url) {
                              // For grouped athlete cards, show thumbnail as static preview (no video element)
                              if (latest.thumbnail_url) {
                                return (
                                  <Image
                                    src={latest.thumbnail_url}
                                    alt={g.author}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                  />
                                );
                              }
                              // Fallback: show first frame using video element but muted/no controls
                              return (
                                <video
                                  preload="metadata"
                                  muted
                                  playsInline
                                  src={latest.url}
                                  className="w-full h-full object-cover bg-black"
                                />
                              );
                            }
                            return (
                              <div className="text-[hsl(var(--muted))] text-sm">No preview</div>
                            );
                          })()}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3
                              className="text-sm font-semibold text-[hsl(var(--foreground))] truncate"
                              title={g.author}
                            >
                              {g.author || 'Unknown'}
                            </h3>
                            <span className="text-xs text-[hsl(var(--muted))]">
                              {g.count} items
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <button
                              onClick={() => setActiveAuthorId(g.author_id)}
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: 'hsl(var(--secondary))',
                                border: '1px solid hsl(var(--border))',
                              }}
                            >
                              Open
                            </button>
                            <button
                              onClick={() => selectAllForAuthor(g.author_id)}
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: 'hsl(var(--secondary))',
                                border: '1px solid hsl(var(--border))',
                              }}
                            >
                              Select all
                            </button>
                            <button
                              onClick={async () => {
                                download.begin('Downloading athlete content…');
                                const { data: sessionData } =
                                  await supabaseClient.auth.getSession();
                                const token = sessionData.session?.access_token;
                                const resp = await fetch('/api/content/download', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({
                                    all_for_athlete: true,
                                    athlete_id: g.author_id,
                                  }),
                                });
                                const j = await resp.json();
                                if (j.urls && Array.isArray(j.urls)) {
                                  await downloadFromSignedUrls(
                                    j.urls.map((u: any) => ({ url: u.url, filename: u.filename })),
                                  );
                                }
                                download.end();
                              }}
                              className="btn px-2 py-1"
                            >
                              Download all
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full overflow-x-hidden">
                {(activeAuthorId
                  ? items.filter((it) => it.author_id === activeAuthorId)
                  : items
                ).map((it) => (
                  <div key={it.id} className="card overflow-hidden">
                    <div
                      className="aspect-video flex items-center justify-center relative"
                      style={{ backgroundColor: 'hsl(var(--secondary))' }}
                    >
                      {(() => {
                        console.log(
                          'Rendering item:',
                          it.filename,
                          'thumbnail_url:',
                          it.thumbnail_url,
                          'url:',
                          it.url,
                          'file_type:',
                          it.file_type,
                        );
                        if (it.file_type === 'image' && (it.thumbnail_url || it.url)) {
                          return (
                            <Image
                              src={it.thumbnail_url || it.url || ''}
                              alt={it.filename}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          );
                        } else if (it.file_type === 'video' && it.url) {
                          // Inline playable video in the card - ALWAYS use original file URL for playback
                          return (
                            <video
                              controls
                              playsInline
                              preload="metadata"
                              src={it.url}
                              poster={it.thumbnail_url || undefined}
                              className="w-full h-full object-cover"
                            />
                          );
                        } else {
                          return <div className="text-[hsl(var(--muted))] text-sm">No preview</div>;
                        }
                      })()}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className="text-sm font-semibold text-[hsl(var(--foreground))] truncate"
                          title={it.filename}
                        >
                          {it.filename}
                        </h3>
                        <span className="text-xs text-[hsl(var(--muted))]">
                          {it.file_size ? (it.file_size / 1024 / 1024).toFixed(1) : '—'} MB
                        </span>
                      </div>
                      <div className="text-xs text-[hsl(var(--muted))] flex items-center justify-between">
                        <span>{it.author || 'Unknown'}</span>
                        <span>{new Date(it.created_at).toLocaleDateString()}</span>
                      </div>
                      {it.session_title && (
                        <div className="text-xs text-[hsl(var(--muted))] mt-1 truncate">
                          Session: {it.session_title}
                        </div>
                      )}
                      {/* Rating on cards */}
                      <div className="mt-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={async () => {
                                await fetch('/api/content/files', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: it.id, rating: star }),
                                });
                                setItems((prev) =>
                                  prev.map((p) =>
                                    p.id === it.id
                                      ? {
                                          ...p,
                                          metadata: { ...(p.metadata || {}), rating: star },
                                        }
                                      : p,
                                  ),
                                );
                              }}
                              className={`text-sm ${((it.metadata as any)?.rating || 0) >= star ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--border))]'} hover:text-[hsl(var(--warning))]`}
                              aria-label={`Rate ${star}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <button
                          onClick={() =>
                            openViewer(
                              activeAuthorId
                                ? items.filter((x) => x.author_id === activeAuthorId)
                                : items,
                              it.id,
                            )
                          }
                          className="px-2 py-1 rounded hover:opacity-80"
                          style={{
                            backgroundColor: 'hsl(var(--secondary))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          View
                        </button>
                        <label className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted))]">
                          <input
                            type="checkbox"
                            checked={!!selected[it.id]}
                            onChange={(e) =>
                              setSelected((s) => ({ ...s, [it.id]: e.target.checked }))
                            }
                          />
                          Select
                        </label>
                        <button
                          onClick={() => openEdit(it)}
                          className="px-2 py-1 rounded hover:opacity-80"
                          style={{
                            backgroundColor: 'hsl(var(--secondary))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          Edit
                        </button>
                        {(role === 'admin' || role === 'manager') && (
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this item permanently?')) return;
                              const { data: sessionData } = await supabaseClient.auth.getSession();
                              const token = sessionData.session?.access_token;
                              const res = await fetch(`/api/content/files?id=${encodeURIComponent(it.id)}`, {
                                method: 'DELETE',
                                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                              });
                              if (!res.ok) {
                                const j = await res.json().catch(() => ({}));
                                alert(j.error || 'Failed to delete');
                                return;
                              }
                              window.location.reload();
                            }}
                            className="px-2 py-1 rounded hover:opacity-80 text-red-600"
                            style={{ border: '1px solid hsl(var(--border))' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg border"
                style={{
                  backgroundColor: 'hsl(var(--secondary))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                {/* Context header showing athlete name if inside athlete view */}
                {role !== 'athlete' && activeAuthorId && (
                  <div
                    className="px-4 py-3 border-b text-sm flex items-center justify-between"
                    style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  >
                    <div>
                      <span className="text-[hsl(var(--muted))] font-semibold">Athlete:</span>{' '}
                      {items.find((i) => i.author_id === activeAuthorId)?.author || 'Unknown'}
                    </div>
                    <div>
                      <button
                        onClick={() => setActiveAuthorId(null)}
                        className="px-2 py-1 border rounded"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
                {/* Filters and sort controls */}
                <div className="px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[hsl(var(--muted))] hidden sm:inline">Type:</span>
                    <div className="min-w-[9rem] w-full sm:w-auto">
                      <ResponsiveSelect
                        ariaLabel="Filter type"
                        value={tableFilter.type}
                        onChange={(v) => setTableFilter({ type: v as any })}
                        options={[
                          { value: 'all', label: 'All' },
                          { value: 'image', label: 'Images' },
                          { value: 'video', label: 'Videos' },
                          { value: 'document', label: 'Documents' },
                          { value: 'other', label: 'Other' },
                        ]}
                        className="w-full px-3 h-11 sm:h-8 rounded [background-color:hsl(var(--secondary))] [border:1px_solid_hsl(var(--border))]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[hsl(var(--muted))] hidden sm:inline">Sort by:</span>
                    <div className="min-w-[9rem] w-full sm:w-auto">
                      <ResponsiveSelect
                        ariaLabel="Sort key"
                        value={tableSort.key}
                        onChange={(v) => setTableSort((s) => ({ ...s, key: v as any }))}
                        options={[
                          { value: 'created_at', label: 'Date' },
                          { value: 'filename', label: 'Name' },
                          { value: 'file_size', label: 'Size' },
                          { value: 'file_type', label: 'Type' },
                          { value: 'rating', label: 'Rating' },
                        ]}
                        className="w-full px-3 h-11 sm:h-8 rounded [background-color:hsl(var(--secondary))] [border:1px_solid_hsl(var(--border))]"
                      />
                    </div>
                  </div>
                </div>
                <div className="mobile-scroll overscroll-x-contain">
                  <table className="min-w-[900px] w-full text-sm border-collapse">
                    <thead
                      style={{
                        backgroundColor: 'hsl(var(--secondary))',
                        color: 'hsl(var(--muted))',
                      }}
                    >
                      <tr>
                        <th className="text-left px-4 py-2">
                          <input
                            type="checkbox"
                            checked={(() => {
                              const displayed = getDisplayedItems();
                              return displayed.length > 0 && displayed.every((it) => !!selected[it.id]);
                            })()}
                            onChange={(e) => toggleMasterForDisplayed(e.target.checked)}
                          />
                        </th>
                        <th className="text-left px-4 py-2">Preview</th>
                        <th className="text-left px-4 py-2">Filename</th>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-left px-4 py-2">Size</th>
                        <th className="text-left px-4 py-2">Rating</th>
                        <th className="text-left px-4 py-2">Author</th>
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-left px-4 py-2">Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDisplayedItems().map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={!!selected[it.id]}
                              onChange={(e) =>
                                setSelected((s) => ({ ...s, [it.id]: e.target.checked }))
                              }
                            />
                          </td>
                          <td className="px-4 py-2">
                            {it.file_type === 'image' && it.url ? (
                              <Image
                                src={it.url}
                                alt={it.filename}
                                width={64}
                                height={40}
                                className="object-cover rounded"
                              />
                            ) : it.file_type === 'video' && it.url ? (
                              <video
                                src={it.url}
                                poster={it.thumbnail_url || undefined}
                                preload="metadata"
                                className="w-16 h-10 rounded"
                              />
                            ) : (
                              <span className="text-[hsl(var(--muted))]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 truncate max-w-[240px]" title={it.filename}>
                            {it.filename}
                          </td>
                          <td className="px-4 py-2">{it.file_type}</td>
                          <td className="px-4 py-2">
                            {it.file_size ? (it.file_size / 1024 / 1024).toFixed(1) : '—'} MB
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={async () => {
                                    await fetch('/api/content/files', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: it.id, rating: star }),
                                    });
                                    // Optimistic update
                                    setItems((prev) =>
                                      prev.map((p) =>
                                        p.id === it.id
                                          ? {
                                              ...p,
                                              metadata: { ...(p.metadata || {}), rating: star },
                                            }
                                          : p,
                                      ),
                                    );
                                  }}
                                  className={
                                    ((it.metadata as any)?.rating || 0) >= star
                                      ? 'text-[hsl(var(--warning))]'
                                      : 'text-[hsl(var(--border))]'
                                  }
                                  aria-label={`Rate ${star}`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">{it.author || 'Unknown'}</td>
                          <td className="px-4 py-2">
                            {new Date(it.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2">{it.session_title || '—'}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {it.url && (
                                <a
                                  className="px-2 py-1 rounded hover:opacity-80"
                                  href={it.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    backgroundColor: 'hsl(var(--secondary))',
                                    border: '1px solid hsl(var(--border))',
                                  }}
                                >
                                  View
                                </a>
                              )}
                              <button
                                onClick={() => openEdit(it)}
                                className="px-2 py-1 rounded hover:opacity-80"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                Edit
                              </button>
                              {(role === 'admin' || role === 'manager') && (
                                <button
                                  onClick={async () => {
                                    if (!confirm('Delete this item permanently?')) return;
                                    const { data: sessionData } = await supabaseClient.auth.getSession();
                                    const token = sessionData.session?.access_token;
                                    const res = await fetch(`/api/content/files?id=${encodeURIComponent(it.id)}`, {
                                      method: 'DELETE',
                                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                    });
                                    if (!res.ok) {
                                      const j = await res.json().catch(() => ({}));
                                      alert(j.error || 'Failed to delete');
                                      return;
                                    }
                                    window.location.reload();
                                  }}
                                  className="px-2 py-1 rounded hover:opacity-80 text-red-600"
                                  style={{ border: '1px solid hsl(var(--border))' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[hsl(var(--muted))] text-lg">No uploads yet</p>
                <a href="/content/upload" className="mt-4 inline-block btn">
                  Upload Content
                </a>
              </div>
            )}
          </>
        )}
        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div
              className="w-full max-w-lg rounded-lg shadow-lg p-6"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit content</h3>
                <button
                  onClick={() => setEditing(null)}
                  className="hover:opacity-80"
                  style={{ color: 'hsl(var(--muted))' }}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Title
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input"
                    placeholder="Optional title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="input"
                    placeholder="e.g. training, carving"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="textarea"
                    placeholder="Short description"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-2 rounded"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
                <button onClick={saveEdit} className="btn">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating selection bar */}
        {selectedCount > 0 && (
          <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg"
            style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
          >
            <span className="text-sm">{selectedCount} selected</span>
            <button
              onClick={() => toggleMasterForDisplayed(true)}
              className="px-2 py-1 rounded text-sm"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              Select all visible
            </button>
            <button
              onClick={() => toggleMasterForDisplayed(false)}
              className="px-2 py-1 rounded text-sm"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              Clear
            </button>
            <button
              onClick={async () => {
                const ids = getSelectedIds();
                const { data: sessionData } = await supabaseClient.auth.getSession();
                const token = sessionData.session?.access_token;
                const resp = await fetch('/api/content/download', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ file_ids: ids }),
                });
                const j = await resp.json();
                if (j.urls && Array.isArray(j.urls)) {
                  await downloadFromSignedUrls(
                    j.urls.map((u: any) => ({ url: u.url, filename: u.filename })),
                  );
                }
                addToast('Download started', 'info');
              }}
              className="px-2 py-1 rounded text-sm"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              Download
            </button>
            {(role === 'admin' || role === 'manager') && (
              <button
                onClick={() => setShowDeleteSelectedModal(true)}
                className="px-2 py-1 rounded text-sm text-white"
                style={{ backgroundColor: 'hsl(var(--error))' }}
              >
                Delete selected
              </button>
            )}
          </div>
        )}

        {/* Confirm delete selected modal */}
        {showDeleteSelectedModal && (role === 'admin' || role === 'manager') && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
            <div
              className="w-full max-w-md rounded-lg shadow-lg p-6"
              style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete selected</h3>
                <button
                  onClick={() => setShowDeleteSelectedModal(false)}
                  className="hover:opacity-80"
                  style={{ color: 'hsl(var(--muted))' }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[hsl(var(--muted))]">
                  You are about to permanently delete <strong className="text-[hsl(var(--foreground))]">{selectedCount}</strong> items.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDeleteSelectedModal(false)}
                  className="px-3 py-2 rounded hover:opacity-80"
                  style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    try {
                      setDeleting(true);
                      const ids = getSelectedIds();
                      const { data: sessionData } = await supabaseClient.auth.getSession();
                      const token = sessionData.session?.access_token;
                      const res = await fetch('/api/content/files', {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ ids }),
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        addToast(j.error || 'Failed to delete selected', 'error');
                        return;
                      }
                      addToast('Selected items deleted', 'success');
                      window.location.reload();
                    } finally {
                      setDeleting(false);
                      setShowDeleteSelectedModal(false);
                    }
                  }}
                  className="px-3 py-2 rounded text-white disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--error))' }}
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}

        {/* Delete ALL confirmation modal (admin-only) */}
        {showDeleteAllModal && role === 'admin' && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
            <div
              className="w-full max-w-md rounded-lg shadow-lg p-6"
              style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Confirm Delete ALL</h3>
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setConfirmPhrase('');
                    setConfirmCount('');
                  }}
                  className="hover:opacity-80"
                  style={{ color: 'hsl(var(--muted))' }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 text-sm">
                <p className="text-[hsl(var(--muted))]">
                  This action will permanently delete <strong className="text-[hsl(var(--foreground))]">ALL</strong> content files ({items.length}).
                  This cannot be undone.
                </p>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Type DELETE ALL to confirm
                  </label>
                  <input
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    className="input"
                    placeholder="DELETE ALL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Enter the total number of items ({items.length})
                  </label>
                  <input
                    value={confirmCount}
                    onChange={(e) => setConfirmCount(e.target.value)}
                    className="input"
                    placeholder={String(items.length)}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setConfirmPhrase('');
                    setConfirmCount('');
                  }}
                  className="px-3 py-2 rounded hover:opacity-80"
                  style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
                <button
                  disabled={
                    deleting || confirmPhrase !== 'DELETE ALL' || Number(confirmCount) !== items.length
                  }
                  onClick={async () => {
                    try {
                      setDeleting(true);
                      const { data: sessionData } = await supabaseClient.auth.getSession();
                      const token = sessionData.session?.access_token;
                      const res = await fetch('/api/content/files?all=true', {
                        method: 'DELETE',
                        headers: {
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        alert(j.error || 'Failed to delete all content');
                        return;
                      }
                      window.location.reload();
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="px-3 py-2 rounded text-white disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--error))' }}
                >
                  {deleting ? 'Deleting…' : 'Confirm Delete ALL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal viewer for images/videos with navigation */}
        {viewerOpen && viewerItems.length > 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <button onClick={closeViewer} className="absolute top-4 right-4 text-white text-2xl">
              ✕
            </button>
            <button
              onClick={prevViewer}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            >
              ‹
            </button>
            <button
              onClick={nextViewer}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            >
              ›
            </button>
            <div className="w-full max-w-5xl p-4">
              {/* Subtitle with athlete name */}
              <div className="mb-2 text-center text-white text-sm opacity-90 truncate">
                {(() => {
                  const athleteName =
                    role !== 'athlete' && activeAuthorId
                      ? items.find((i) => i.author_id === activeAuthorId)?.author || 'Unknown'
                      : viewerItems[viewerIndex]?.author || '';
                  return athleteName ? `Content — ${athleteName}` : 'Content';
                })()}
              </div>
              {(() => {
                const it = viewerItems[viewerIndex];
                if (it.file_type === 'image' && (it.url || it.thumbnail_url)) {
                  return (
                    <Image
                      src={it.url || it.thumbnail_url || ''}
                      alt={it.filename}
                      width={800}
                      height={600}
                      className="w-full max-h-[80vh] object-contain rounded"
                    />
                  );
                }
                if (it.file_type === 'video' && it.url) {
                  return (
                    <video
                      controls
                      autoPlay
                      playsInline
                      src={it.url}
                      poster={it.thumbnail_url || undefined}
                      className="w-full max-h-[80vh] rounded bg-black"
                    />
                  );
                }
                return <div className="text-gray-300 text-center">No preview</div>;
              })()}
              <div className="mt-3 text-center text-white text-sm truncate">
                {viewerItems[viewerIndex]?.filename}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}