'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Upload as UploadIcon,
  Video as VideoIcon,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';

export default function UploadPage() {
  const { user, profile } = useAuth();
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [smoothProgress, setSmoothProgress] = useState(0); // visually smoothed progress (0-100)
  const [etaText, setEtaText] = useState<string>(''); // estimated time remaining
  const [perFileStatus, setPerFileStatus] = useState<
    Array<'pending' | 'uploading' | 'done' | 'error'>
  >([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const totalBytesRef = useRef<number>(0);
  const uploadedBytesRef = useRef<number>(0);
  const currentFileSizeRef = useRef<number>(0);
  const speedRef = useRef<number>(0); // bytes/sec (EMA)
  const animIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastAnimTimeRef = useRef<number>(0);

  async function xhrUploadSignedUrl(
    url: string,
    file: File,
    onProgress: (loaded: number, total: number, deltaBytes: number, dt: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = performance.now();
      xhr.upload.onprogress = e => {
        const now = performance.now();
        const dt = Math.max(0.001, (now - lastTime) / 1000);
        lastTime = now;
        const delta = Math.max(0, (e.loaded || 0) - lastLoaded);
        lastLoaded = e.loaded || 0;
        onProgress(e.loaded || 0, e.total || file.size, delta, dt);
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.open('PUT', url, true);
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', file);
      xhr.send(form);
    });
  }

  function formatEta(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '';
    const sec = Math.ceil(seconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')} remaining`;
  }

  function startProgressAnimation() {
    lastAnimTimeRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, (now - lastAnimTimeRef.current) / 1000);
      lastAnimTimeRef.current = now;

      const total = totalBytesRef.current || 1;
      const baseUploaded = uploadedBytesRef.current;
      let estSpeed = speedRef.current;
      if (!estSpeed && startTimeRef.current) {
        const elapsed = (now - startTimeRef.current) / 1000;
        estSpeed = elapsed > 0 ? baseUploaded / elapsed : 0;
      }

      // optimistic estimate towards current file, capped at 90% of its size
      let estUploaded = baseUploaded + Math.max(0, estSpeed) * dt;
      const cap = baseUploaded + currentFileSizeRef.current * 0.9;
      if (estUploaded > cap) estUploaded = cap;

      const pct = Math.min(99.5, (estUploaded / total) * 100);
      setSmoothProgress(pct);

      const remainingBytes = Math.max(0, total - estUploaded);
      const eta = Math.max(0, remainingBytes / Math.max(estSpeed || 0, 1));
      setEtaText(formatEta(eta));

      animIdRef.current = requestAnimationFrame(tick);
    };
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    animIdRef.current = requestAnimationFrame(tick);
  }

  function stopProgressAnimation(finalize = true) {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    animIdRef.current = null;
    if (finalize) {
      setSmoothProgress(100);
      setEtaText('');
    }
  }

  useEffect(() => {
    if (user && !autoOpened && !isUploading) {
      // Abre la galería directamente al entrar en la página
      inputRef.current?.click();
      setAutoOpened(true);
    }
  }, [user, autoOpened, isUploading]);

  useEffect(() => {
    fetchGallery();
  }, []);

  async function fetchGallery() {
    try {
      const res = await fetch('/api/content/gallery?limit=12');
      const json = await res.json();
      if (res.ok && json?.items) setGalleryItems(json.items);
    } catch (e) {
      console.warn('Failed to load gallery', e);
    }
  }

  async function onSubmit() {
    if (!files || files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    if (!user) {
      alert('You must be logged in to upload content');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');
    // Setup totals for progress smoothing
    try {
      const fileArray = Array.from(files);
      totalBytesRef.current = fileArray.reduce((sum, f) => sum + (f.size || 0), 0);
      uploadedBytesRef.current = 0;
      speedRef.current = 0;
      startTimeRef.current = performance.now();
      setSmoothProgress(0);
      setEtaText('');
      startProgressAnimation();
    } catch {}

    try {
      // Create upload session
      const { data: session, error: sessionError } = await supabaseClient
        .from('upload_sessions')
        .insert({
          title: title || `Upload Session ${new Date().toLocaleString()}`,
          description: description,
          user_id: user.id,
          status: 'uploading',
        })
        .select()
        .single();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'Failed to create upload session');
      }

      setUploadStatus(`Created session: ${session.id}`);

      // Upload files to Supabase Storage
      const fileArray = Array.from(files);
      let uploadedCount = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          setUploadStatus(`Uploading ${file.name}...`);
          setPerFileStatus(prev => {
            const next = [...prev];
            next[i] = 'uploading';
            return next;
          });
          currentFileSizeRef.current = file.size || 0;
          const startedAt = performance.now();

          // Generate unique filename
          const fileExtension = file.name.split('.').pop();
          const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
          const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'user-uploads';
          const filePath = `content/${user.id}/${session.id}/${uniqueFileName}`;

          // Use signed URL + XHR to get realtime progress
          const { data: signed, error: signErr } = await supabaseClient.storage
            .from(bucket)
            .createSignedUploadUrl(filePath);
          if (signErr || !signed?.signedUrl) {
            throw new Error('Failed to create signed upload URL');
          }
          const baseBefore = uploadedBytesRef.current;
          await xhrUploadSignedUrl(signed.signedUrl, file, (loaded, total, delta, dt) => {
            uploadedBytesRef.current = baseBefore + loaded;
            // Update EMA speed based on instantaneous throughput
            const inst = delta / Math.max(0.001, dt);
            speedRef.current = speedRef.current ? speedRef.current * 0.7 + inst * 0.3 : inst;
            const pct = (uploadedBytesRef.current / Math.max(1, totalBytesRef.current)) * 100;
            setSmoothProgress(Math.min(99.5, pct));
          });

          // Save file metadata to database (align with schema)
          const fileTypePrefix = file.type.startsWith('image')
            ? 'image'
            : file.type.startsWith('video')
              ? 'video'
              : file.type
                ? 'other'
                : 'other';

          // Generate thumbnail automatically
          let thumbnailPath: string | null = null;
          try {
            console.log('Starting thumbnail generation for:', file.name);
            const thumbBlob = await generateThumbnail(file);
            if (thumbBlob) {
              console.log('Thumbnail blob created, size:', thumbBlob.size);
              const tPath = `${filePath}.thumb.jpg`;
              console.log('Uploading thumbnail to path:', tPath);
              const { error: tErr } = await supabaseClient.storage
                .from(bucket)
                .upload(tPath, thumbBlob, { contentType: 'image/jpeg', upsert: true });
              if (!tErr) {
                thumbnailPath = tPath;
                console.log('Thumbnail uploaded successfully to:', thumbnailPath);
              } else {
                console.error('Thumbnail upload error:', tErr);
              }
            } else {
              console.log('No thumbnail blob generated for:', file.name);
            }
          } catch (thumbError) {
            console.error('Thumbnail generation/upload error:', thumbError);
          }

          // Insert minimal required columns first for broad schema compatibility
          const baseInsert = {
            session_id: session.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: fileTypePrefix,
            mime_type: file.type || null,
          } as any;

          // Send to server route to avoid client RLS 403s
          const { data: authData } = await supabaseClient.auth.getSession();
          const accessToken = authData.session?.access_token;
          const res = await fetch('/api/content/files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              ...baseInsert,
              thumbnail_path: thumbnailPath || undefined,
              metadata: description ? { description } : undefined,
            }),
          });
          let inserted: { id?: string } | null = null;
          let dbError: any = null;
          try {
            const json = await res.json();
            if (res.ok) inserted = json;
            else dbError = json;
          } catch (e) {
            dbError = e;
          }

          if (dbError) {
            console.error(`Failed to save metadata for ${file.name}:`, dbError, {
              message: (dbError as any)?.message,
              details: (dbError as any)?.details,
              hint: (dbError as any)?.hint,
              code: (dbError as any)?.code,
            });
            // Continue with other files even if metadata save fails
          } else if (inserted?.id && (thumbnailPath || description)) {
            // Best-effort update for optional columns (may not exist in early schema)
            try {
              const optionalUpdate: any = {};
              if (thumbnailPath) optionalUpdate.thumbnail_path = thumbnailPath;
              if (description) optionalUpdate.metadata = { description };
              if (Object.keys(optionalUpdate).length > 0) {
                const { error: updErr } = await supabaseClient
                  .from('upload_files')
                  .update(optionalUpdate)
                  .eq('id', inserted.id);
                if (updErr) {
                  console.warn(`Optional fields update skipped for ${file.name}:`, updErr, {
                    message: (updErr as any)?.message,
                    details: (updErr as any)?.details,
                    hint: (updErr as any)?.hint,
                    code: (updErr as any)?.code,
                  });
                }
              }
            } catch (optErr) {
              console.warn(`Optional fields update failed for ${file.name}:`, optErr);
            }
          }

          uploadedCount++;
          // Update totals and speed estimate (EMA)
          const elapsed = Math.max(0.1, (performance.now() - startedAt) / 1000);
          const fileSpeed = (file.size || 0) / elapsed;
          speedRef.current = speedRef.current
            ? speedRef.current * 0.6 + fileSpeed * 0.4
            : fileSpeed;
          uploadedBytesRef.current += file.size || 0;
          setUploadProgress((uploadedCount / fileArray.length) * 100);
          setUploadStatus(`Uploaded ${uploadedCount}/${fileArray.length} files`);
          setPerFileStatus(prev => {
            const next = [...prev];
            next[i] = 'done';
            return next;
          });
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          setUploadStatus(
            `Error uploading ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          );
          setPerFileStatus(prev => {
            const next = [...prev];
            next[i] = 'error';
            return next;
          });
          // Continue with other files
        }
      }

      // Update session status (align with schema - only status exists)
      await supabaseClient
        .from('upload_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      setUploadStatus(`Upload completed! ${uploadedCount} files uploaded successfully.`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      fetchGallery();

      // Reset form (campos opcionales, no obligatorios)
      setTitle('');
      setDescription('');
      setFiles(null);
      setPerFileStatus([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      stopProgressAnimation(true);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
      setPerFileStatus(Array.from(e.target.files).map(() => 'pending'));
    }
  };

  // Generate a thumbnail Blob (image/jpeg). For images: downscale; for videos: capture frame 1s
  async function generateThumbnail(file: File): Promise<Blob | null> {
    try {
      console.log('Generating thumbnail for:', file.name, 'type:', file.type);
      if (file.type.startsWith('image')) {
        console.log('Processing image file');
        const img = new Image();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        const maxW = 640,
          maxH = 360;
        let w = img.width,
          h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, w, h);
        const blob: Blob | null = await new Promise(resolve =>
          canvas.toBlob(resolve, 'image/jpeg', 0.8)
        );
        console.log('Image thumbnail generated, size:', blob?.size);
        return blob;
      } else if (file.type.startsWith('video')) {
        console.log('Processing video file');
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('video load error'));
        });
        // Seek to 1s or 0.1 if shorter
        const target = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
        await new Promise<void>(resolve => {
          const handler = () => {
            video.removeEventListener('seeked', handler);
            resolve();
          };
          video.addEventListener('seeked', handler);
          try {
            video.currentTime = target;
          } catch {
            resolve();
          }
        });
        const canvas = document.createElement('canvas');
        const maxW = 640,
          maxH = 360;
        const vw = video.videoWidth || 640,
          vh = video.videoHeight || 360;
        const ratio = Math.min(maxW / vw, maxH / vh, 1);
        canvas.width = Math.round(vw * ratio);
        canvas.height = Math.round(vh * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob: Blob | null = await new Promise(resolve =>
          canvas.toBlob(resolve, 'image/jpeg', 0.8)
        );
        URL.revokeObjectURL(video.src);
        console.log('Video thumbnail generated, size:', blob?.size);
        return blob;
      }
      console.log('No thumbnail generated for file type:', file.type);
      return null;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  const removeFile = (index: number) => {
    if (files) {
      const dt = new DataTransfer();
      const fileArray = Array.from(files);
      fileArray.splice(index, 1);
      fileArray.forEach(file => dt.items.add(file));
      setFiles(dt.files);
      setPerFileStatus(prev => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-yellow-800 mb-4">Authentication Required</h1>
          <p className="text-yellow-700">Please log in to upload content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-full sm:max-w-2xl overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Upload content</h1>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <style jsx>{`
          @media (max-width: 640px) {
            .fix-mobile-overflow * {
              min-width: 0;
            }
          }
        `}</style>
        {/* Subtle success */}
        {showSuccess && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 transition-all">
            <CheckCircle2 className="h-5 w-5" />
            <span>Your content was uploaded successfully!</span>
          </div>
        )}

        {/* Primary button: open gallery */}
        <input
          ref={inputRef}
          id="files"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-black text-white rounded-xl hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800"
          disabled={isUploading}
        >
          <UploadIcon className="h-5 w-5" />
          <span className="text-base sm:text-lg">Select photos or videos</span>
        </button>

        {/* File list */}
        {files && files.length > 0 && (
          <div className="space-y-3 w-full max-w-full">
            <p className="text-sm font-medium text-gray-700">Selected ({files.length})</p>
            <div className="space-y-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain pr-1 w-full max-w-full">
              {Array.from(files).map((file, index) => {
                const isImage = file.type?.startsWith('image');
                const status = perFileStatus[index] || 'pending';
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded bg-gray-50 px-3 py-2 w-full max-w-full"
                  >
                    <div className="shrink-0 text-gray-600">
                      {isImage ? (
                        <ImageIcon className="h-5 w-5" />
                      ) : (
                        <VideoIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 max-w-full">
                      <div className="flex items-center justify-between gap-3 max-w-full">
                        <span className="truncate text-sm text-gray-800 break-words max-w-[75%]">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {status === 'uploading' && (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            <span className="text-blue-700">Uploading…</span>
                          </>
                        )}
                        {status === 'done' && (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Completed</span>
                          </>
                        )}
                        {status === 'error' && (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-red-700">Error</span>
                          </>
                        )}
                        {status === 'pending' && <span className="text-gray-600">Queued</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 rounded px-2 py-2 text-red-600 hover:text-red-700 focus:outline-none"
                      disabled={isUploading}
                      aria-label="Remove"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global progress */}
        {(isUploading || uploadProgress > 0 || smoothProgress > 0) && (
          <div className="space-y-2 w-full max-w-full" role="status" aria-live="polite">
            <div className="flex justify-between text-sm text-gray-600 w-full max-w-full">
              <span>{uploadStatus}</span>
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" className="text-gray-500">
                  <path
                    fill="currentColor"
                    d="M12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1m1 11V6h-2v8h7v-2Z"
                  />
                </svg>
                {etaText || `${Math.round(Math.max(uploadProgress, smoothProgress))}%`}
              </span>
            </div>
            {/* Animated bar with stripes, glow and moving marker */}
            <div className="relative w-full h-3 rounded-full overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300">
              {/* Stripes layer */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(0,0,0,0.25) 0, rgba(0,0,0,0.25) 10px, transparent 10px, transparent 20px)',
                }}
              />
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-black via-gray-900 to-black shadow-[0_0_18px_rgba(0,0,0,0.35)] transition-[width] duration-150 ease-linear"
                style={{ width: `${Math.max(uploadProgress, smoothProgress)}%` }}
              />
              {/* Moving marker (comet) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-[left] duration-150 ease-linear"
                style={{ left: `calc(${Math.max(uploadProgress, smoothProgress)}% - 4px)` }}
                aria-hidden
              />
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={onSubmit}
          disabled={!files || files.length === 0 || isUploading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
            </>
          ) : (
            'Upload now'
          )}
        </button>

        {/* Options (optional fields) */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowOptions(v => !v)}
            className="text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            {showOptions ? 'Hide options' : 'Show options'}
          </button>
          {showOptions && (
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Session title (optional)
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="Add a title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Describe what you upload (optional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="text-sm text-gray-500 text-center">
          Signed in as: {profile?.name || user.email} ({profile?.role || 'user'})
        </div>
      </div>

      {/* Mini gallery */}
      <div className="mt-6 w-full max-w-full overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Your latest uploads</h2>
        {galleryItems.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
            You haven't uploaded anything yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-full">
            {galleryItems.map((item: any) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-md border border-gray-200 bg-white w-full max-w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail_url || item.url}
                  alt={item.filename}
                  className="h-24 w-full object-cover"
                  loading="lazy"
                />
                {item.file_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <VideoIcon className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
