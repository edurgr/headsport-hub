'use client';

import { useEffect, useRef, useState } from 'react';

import AddressManager from '@/components/AddressManager';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1); // user zoom factor
  const [baseScale, setBaseScale] = useState<number>(1); // fit-to-cover base scale
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [previewRatio, setPreviewRatio] = useState<number>(0.375); // previewSize / cropBoxSize
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    organization: profile?.organization || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'US',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: profile?.name || '',
        organization: profile?.organization || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        city: profile?.city || '',
        state: profile?.state || '',
        postal_code: profile?.postal_code || '',
        country: profile?.country || 'US',
      });
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    }
  }, [user, profile]);

  // Load avatar from storage on mount/user change (robust even without DB columns)
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      try {
        const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'content';
        const path = `${user.id}/avatar.jpg`;
        // Try signed URL first (works for private buckets)
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60);
        if (!error && data?.signedUrl) {
          setAvatarUrl(`${data.signedUrl}`);
          return;
        }
        // Fallback to public URL
        const pub = supabaseClient.storage.from(bucket).getPublicUrl(path);
        if (pub?.data?.publicUrl) setAvatarUrl(`${pub.data.publicUrl}`);
      } catch {}
    };
    loadAvatar();
  }, [user?.id]);

  // Keep preview scale ratio in sync with layout sizes
  useEffect(() => {
    const updateRatio = () => {
      const cropW = cropBoxRef.current?.clientWidth || 1;
      const prevW = previewBoxRef.current?.clientWidth || 1;
      setPreviewRatio(prevW / cropW);
    };
    updateRatio();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRatio) : null;
    if (ro) {
      if (cropBoxRef.current) ro.observe(cropBoxRef.current);
      if (previewBoxRef.current) ro.observe(previewBoxRef.current);
    } else {
      window.addEventListener('resize', updateRatio);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', updateRatio);
    };
  }, []);

  // Removed recent uploads from Profile; this now lives in Dashboard

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (updateProfile) {
        await updateProfile(formData);
        setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile values
    if (profile) {
      setFormData({
        name: profile.name || '',
        organization: profile.organization || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'US',
      });
    }
    setIsEditing(false);
    setSaveMessage(null);
  };

  // No addresses persisted yet; address fields are part of profile

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Profile</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center">
            {saveMessage.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {saveMessage.text}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 overflow-x-hidden">
        <div className="space-y-6">
          {/* Profile Photo Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>

            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Profile avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <svg
                    className="w-20 h-20 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>

              <div className="mb-4">
                <input
                  type="file"
                  id="profile-photo"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setAvatarSrc(url);
                    setScale(1);
                    setOffset({ x: 0, y: 0 });
                    setIsCropping(true);
                    // Preload to compute base scale so the image covers the crop square
                    try {
                      const probe = new Image();
                      probe.src = url;
                      await probe.decode().catch(() => {});
                      const c = cropBoxRef.current?.clientWidth || 256;
                      const cover = Math.max(
                        c / Math.max(1, probe.naturalWidth),
                        c / Math.max(1, probe.naturalHeight),
                      );
                      setBaseScale(cover);
                    } catch {}
                  }}
                />
                <label
                  htmlFor="profile-photo"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Select File
                </label>
                <p className="text-sm text-gray-500 mt-2">No file selected</p>
              </div>

              <p className="text-sm text-gray-600">Upload a square image for best results.</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Profile</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm">
              Manage your personal info and contact details
            </p>

            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-gray-900">{formData.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{profile?.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <p className="mt-1 text-gray-900">{formData.organization || '-'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-gray-900">{formData.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <p className="mt-1 text-gray-900">{formData.country || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-gray-900">{formData.address || '-'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <p className="mt-1 text-gray-900">{formData.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <p className="mt-1 text-gray-900">{formData.state || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <p className="mt-1 text-gray-900">{formData.postal_code || '-'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Organization name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street and number"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="State / Region"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ZIP / Postal Code"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isSaving ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Profile'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Addresses Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Addresses</h2>
          <p className="text-sm text-gray-600 mb-6">
            Manage your shipping addresses for orders. You can add multiple addresses and set one as
            preferred.
          </p>
          <AddressManager useDatabase={true} />
        </div>

        {/* Right Column - Role and meta */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Role:</span>{' '}
              <span className="uppercase px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                {profile?.role}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>{' '}
              <span className="text-gray-600">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Updated:</span>{' '}
              <span className="text-gray-600">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cropper Modal */}
      {isCropping && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg overflow-hidden shadow-xl">
            <div className="p-4 border-b text-gray-900 font-semibold">Crop your photo</div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Crop area with circular guide */}
                <div
                  ref={cropBoxRef}
                  className="mx-auto w-64 h-64 rounded-lg overflow-hidden bg-gray-100 relative touch-pan-y touch-pan-x"
                >
                  <div className="absolute inset-0 rounded-full ring-2 ring-white/90 pointer-events-none" />
                  {avatarSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={imgRef}
                      src={avatarSrc}
                      alt="crop"
                      className="select-none absolute left-1/2 top-1/2 will-change-transform"
                      style={{
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${baseScale * scale})`,
                      }}
                      onMouseDown={(e) => {
                        setDragging(true);
                        dragRef.current = {
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: offset.x,
                          origY: offset.y,
                        };
                      }}
                      onMouseMove={(e) => {
                        if (!dragging || !dragRef.current) return;
                        const dx = e.clientX - dragRef.current.startX;
                        const dy = e.clientY - dragRef.current.startY;
                        setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                      }}
                      onMouseUp={() => {
                        setDragging(false);
                        dragRef.current = null;
                      }}
                      onMouseLeave={() => {
                        setDragging(false);
                        dragRef.current = null;
                      }}
                      onTouchStart={(e) => {
                        const t = e.touches[0];
                        setDragging(true);
                        dragRef.current = {
                          startX: t.clientX,
                          startY: t.clientY,
                          origX: offset.x,
                          origY: offset.y,
                        };
                      }}
                      onTouchMove={(e) => {
                        if (!dragging || !dragRef.current) return;
                        const t = e.touches[0];
                        const dx = t.clientX - dragRef.current.startX;
                        const dy = t.clientY - dragRef.current.startY;
                        setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                      }}
                      onTouchEnd={() => {
                        setDragging(false);
                        dragRef.current = null;
                      }}
                    />
                  )}
                </div>
                {/* Live circular preview (LinkedIn-like) */}
                <div className="flex items-center justify-center">
                  <div
                    ref={previewBoxRef}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 relative"
                  >
                    {avatarSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="preview"
                        className="absolute left-1/2 top-1/2 select-none"
                        style={{
                          transform: `translate(calc(-50% + ${offset.x * previewRatio}px), calc(-50% + ${offset.y * previewRatio}px)) scale(${baseScale * scale * previewRatio})`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setIsCropping(false);
                  if (avatarSrc) URL.revokeObjectURL(avatarSrc);
                  setAvatarSrc(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: 'hsl(var(--foreground))' }}
                onClick={async () => {
                  if (!imgRef.current || !user) return;
                  const img = imgRef.current;
                  const canvas = document.createElement('canvas');
                  const size = 512;
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  // Draw using the same transform as the crop box: translate + scale(baseScale*scale)
                  ctx.fillStyle = '#fff';
                  ctx.fillRect(0, 0, size, size);
                  ctx.translate(size / 2, size / 2);
                  const totalScale = baseScale * scale;
                  ctx.scale(totalScale, totalScale);
                  const natural = new Image();
                  natural.src = img.src;
                  await natural.decode().catch(() => {});
                  ctx.drawImage(
                    natural,
                    -natural.width / 2 + offset.x / totalScale,
                    -natural.height / 2 + offset.y / totalScale,
                  );
                  const blob: Blob | null = await new Promise((res) =>
                    canvas.toBlob(res, 'image/jpeg', 0.9),
                  );
                  if (!blob) return;
                  const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'content';
                  // Storage policies require first folder to be the user id
                  const path = `${user.id}/avatar.jpg`;
                  try {
                    await supabaseClient.storage.from(bucket).remove([path]);
                  } catch {}
                  const { error } = await supabaseClient.storage
                    .from(bucket)
                    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                  if (error) {
                    alert(`Failed to upload avatar: ${error.message}`);
                    return;
                  }
                  // Prefer a fresh signed URL to avoid cache issues
                  let freshUrl: string | null = null;
                  try {
                    const { data } = await supabaseClient.storage
                      .from(bucket)
                      .createSignedUrl(path, 60 * 60);
                    freshUrl = data?.signedUrl || null;
                  } catch {}
                  if (!freshUrl) {
                    try {
                      const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
                      freshUrl = data.publicUrl;
                    } catch {}
                  }
                  setAvatarUrl(freshUrl || `${bucket}/${path}?t=${Date.now()}`);
                  // Best effort: update profile with avatar_url/avatar_path if available
                  try {
                    await supabaseClient
                      .from('profiles')
                      .update({ avatar_url: freshUrl || null, avatar_path: path })
                      .eq('id', user.id);
                  } catch {}
                  setIsCropping(false);
                  if (avatarSrc) URL.revokeObjectURL(avatarSrc);
                  setAvatarSrc(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
