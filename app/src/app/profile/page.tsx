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
  const [cropSize, setCropSize] = useState<number>(256); // Default or initial crop size
  const [formData, setFormData] = useState({
    name: '', // Initialize empty, populate in useEffect
    organization: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US', // Default country
  });

  // Populate form data when profile is loaded or changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        organization: profile.organization || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'US', // Use profile country or default
      });
      // load avatar if present in profile data (faster initial load)
      const possible = (profile as any).avatar_url || (profile as any).avatar_path || null;
      if (typeof possible === 'string') setAvatarUrl(possible);
    }
  }, [profile]);

  // Load avatar from storage on mount/user change
  useEffect(() => {
    const loadAvatar = async () => {
      // Don't run if user is null
      if (!user) {
        setAvatarUrl(null); // Clear avatar if user logs out
        return;
      }
      try {
        const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'content';
        // Consistent path based on user ID
        const path = `${user.id}/avatar.jpg`;

        // Attempt to get a signed URL (valid for a limited time, works for private buckets)
        const { data: signedData, error: signedError } = await supabaseClient.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60); // 1 hour validity

        if (!signedError && signedData?.signedUrl) {
          // Add a timestamp to break browser cache if the image was updated
          setAvatarUrl(`${signedData.signedUrl}&t=${Date.now()}`);
          return;
        }

        // Fallback: Try getting a public URL (works for public buckets or if signed URL fails)
        const { data: publicData } = supabaseClient.storage.from(bucket).getPublicUrl(path);
        if (publicData?.publicUrl) {
          // Add timestamp here too
          setAvatarUrl(`${publicData.publicUrl}?t=${Date.now()}`);
          return;
        }

        // If both fail, assume no avatar exists
        console.warn("Could not load avatar - signed or public URL failed.");
        setAvatarUrl(null);

      } catch (fetchError) {
         console.error("Error loading avatar:", fetchError);
         setAvatarUrl(null); // Ensure avatar is cleared on error
      }
    };
    loadAvatar();
  }, [user]); // CORREGIDO: Depend on the whole user object

  // Keep preview scale ratio in sync with layout sizes
  useEffect(() => {
    const updateRatio = () => {
      const cropW = cropBoxRef.current?.clientWidth || 1;
      const prevW = previewBoxRef.current?.clientWidth || 1;
      setPreviewRatio(prevW / cropW);
      setCropSize(cropW);
    };
    updateRatio(); // Initial calculation
    // Use ResizeObserver if available for better performance
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRatio) : null;
    if (ro) {
      if (cropBoxRef.current) ro.observe(cropBoxRef.current);
      if (previewBoxRef.current) ro.observe(previewBoxRef.current);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', updateRatio);
    }
    // Cleanup function
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', updateRatio);
    };
  }, []); // Empty array: runs once on mount, cleans up on unmount

  // Removed recent uploads from Profile; this now lives in Dashboard

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (updateProfile) {
        // Only send fields that might have changed
        const updateData = {
          name: formData.name,
          organization: formData.organization,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        };
        await updateProfile(updateData);
        setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
         throw new Error("updateProfile function not available");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({
        type: 'error',
        text: (error instanceof Error ? error.message : 'Failed to update profile. Please try again.'),
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleCancel = () => {
    // Reset form data to original profile values if profile exists
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
    } else {
      // Reset to empty if profile somehow isn't loaded
       setFormData({ name: '', organization: '', phone: '', address: '', city: '', state: '', postal_code: '', country: 'US' });
    }
    setIsEditing(false);
    setSaveMessage(null); // Clear any previous messages
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
               {/* Avatar Display */}
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Profile avatar"
                    key={avatarUrl} // Add key to force re-render on URL change
                    className="w-full h-full object-cover" // Removed rounded-full here
                    onError={(e) => { // Handle image loading errors
                      console.warn("Avatar image failed to load:", avatarUrl);
                      (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image
                      // Optionally show placeholder again
                    }}
                  />
                  // Fallback placeholder logic integrated with onError or potentially show if !avatarUrl initially
                ) : (
                  <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                )}
              </div>


              {/* File Input and Label */}
              <div className="mb-4">
                <input
                  type="file"
                  id="profile-photo-input" // Changed ID to avoid conflict if label reused
                  className="hidden"
                  accept="image/jpeg, image/png, image/webp" // Specify accepted types
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Basic validation (e.g., size limit)
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
                      alert("File is too large. Please select an image under 5MB.");
                      e.target.value = ''; // Reset file input
                      return;
                    }


                    const url = URL.createObjectURL(file);
                    setAvatarSrc(url); // Set source for cropper
                    setScale(1); // Reset cropper state
                    setOffset({ x: 0, y: 0 });
                    setIsCropping(true); // Open cropper modal

                    // Preload image to calculate initial scale for covering crop box
                    try {
                      const probe = new Image();
                      probe.onload = () => {
                         const c = cropBoxRef.current?.clientWidth || 256; // Use current crop box size
                         const coverScale = Math.max(
                           c / Math.max(1, probe.naturalWidth),
                           c / Math.max(1, probe.naturalHeight),
                         );
                         setBaseScale(coverScale); // Set base scale to cover
                         URL.revokeObjectURL(url); // Clean up object URL after use
                      };
                      probe.onerror = () => {
                        console.error("Failed to preload image for scaling");
                        URL.revokeObjectURL(url); // Clean up even on error
                      }
                      probe.src = url;
                    } catch (preloadError){
                      console.error("Error during image preload:", preloadError);
                       URL.revokeObjectURL(url); // Clean up on error
                       setIsCropping(false); // Don't show cropper if preload fails
                       alert("Could not process image file.");
                    }
                     e.target.value = ''; // Reset file input after selection
                  }}
                />
                 {/* Updated Label */}
                <label
                  htmlFor="profile-photo-input"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer text-sm" // Adjusted size
                >
                   {isCropping ? 'Processing...' : 'Change Photo'} {/* Dynamic label */}
                </label>
              </div>

              <p className="text-sm text-gray-600">Upload a JPG, PNG, or WEBP file (max 5MB).</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Profile</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm">
              Manage your personal info and contact details
            </p>

            {!isEditing ? (
              <div className="space-y-4">
                {/* Display fields */}
                 <div><label className="label-text">Full Name</label><p className="value-text">{formData.name || '-'}</p></div>
                 <div><label className="label-text">Email</label><p className="value-text">{profile?.email || '-'}</p></div>
                 <div><label className="label-text">Organization</label><p className="value-text">{formData.organization || '-'}</p></div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div><label className="label-text">Phone</label><p className="value-text">{formData.phone || '-'}</p></div>
                   <div><label className="label-text">Country</label><p className="value-text">{formData.country || '-'}</p></div>
                 </div>
                 <div><label className="label-text">Address</label><p className="value-text">{formData.address || '-'}</p></div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div><label className="label-text">City</label><p className="value-text">{formData.city || '-'}</p></div>
                   <div><label className="label-text">State</label><p className="value-text">{formData.state || '-'}</p></div>
                   <div><label className="label-text">Postal Code</label><p className="value-text">{formData.postal_code || '-'}</p></div>
                 </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full btn btn-primary mt-4" // Use theme button classes
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                 {/* Input fields */}
                 <div>
                   <label className="label"><span className="label-text">Full Name</span></label>
                   <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered w-full" placeholder="Enter full name" required />
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Organization</span></label>
                   <input type="text" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className="input input-bordered w-full" placeholder="Organization name" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="label"><span className="label-text">Phone</span></label>
                     <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered w-full" placeholder="Phone number" />
                   </div>
                   <div>
                     <label className="label"><span className="label-text">Country</span></label>
                     <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="input input-bordered w-full" placeholder="Country" />
                   </div>
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Address</span></label>
                   <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered w-full" placeholder="Street address" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div>
                     <label className="label"><span className="label-text">City</span></label>
                     <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input input-bordered w-full" placeholder="City" />
                   </div>
                   <div>
                     <label className="label"><span className="label-text">State / Region</span></label>
                     <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input input-bordered w-full" placeholder="State / Region" />
                   </div>
                   <div>
                     <label className="label"><span className="label-text">Postal Code</span></label>
                     <input type="text" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="input input-bordered w-full" placeholder="ZIP / Postal Code" />
                   </div>
                 </div>

                <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary flex-1" // Use theme button classes
                  >
                    {isSaving ? (
                      <>
                        <span className="loading loading-spinner"></span> {/* Use theme spinner */}
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
                    className="btn btn-ghost flex-1 sm:flex-initial" // Use theme button classes
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
            Manage shipping addresses for orders. Add multiple and set one as preferred.
          </p>
          <AddressManager useDatabase={true} />
        </div>


        {/* Right Column - Role and meta */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Role:</span>{' '}
              <span className="badge badge-neutral uppercase">{profile?.role || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Joined:</span> {/* Changed label */}
              <span className="text-gray-600">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span> {/* Changed label */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center"> {/* Aligned items */}
                {/* Crop area */}
                <div
                  ref={cropBoxRef}
                  className="mx-auto w-full max-w-[256px] aspect-square rounded-lg overflow-hidden bg-gray-100 relative cursor-move touch-none" // Improved touch action
                   onMouseDown={(e) => {
                     if (!imgRef.current) return;
                     setDragging(true);
                     dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
                     (e.target as HTMLElement).style.cursor = 'grabbing';
                   }}
                   onMouseMove={(e) => {
                     if (!dragging || !dragRef.current) return;
                     const dx = e.clientX - dragRef.current.startX;
                     const dy = e.clientY - dragRef.current.startY;
                     // Add boundary checks here if needed
                     setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                   }}
                   onMouseUp={(e) => {
                     setDragging(false);
                     dragRef.current = null;
                      (e.target as HTMLElement).style.cursor = 'move';
                   }}
                   onMouseLeave={(e) => { // Handle mouse leaving the area while dragging
                     if (dragging) {
                       setDragging(false);
                       dragRef.current = null;
                        (e.target as HTMLElement).style.cursor = 'move';
                     }
                   }}
                   onTouchStart={(e) => {
                     if (!imgRef.current || e.touches.length !== 1) return;
                     const t = e.touches[0];
                     setDragging(true);
                     dragRef.current = { startX: t.clientX, startY: t.clientY, origX: offset.x, origY: offset.y };
                   }}
                   onTouchMove={(e) => {
                     if (!dragging || !dragRef.current || e.touches.length !== 1) return;
                     const t = e.touches[0];
                     const dx = t.clientX - dragRef.current.startX;
                     const dy = t.clientY - dragRef.current.startY;
                      // Add boundary checks here if needed
                     setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                   }}
                   onTouchEnd={() => {
                     setDragging(false);
                     dragRef.current = null;
                   }}
                >
                  <div className="absolute inset-0 rounded-full ring-2 ring-white/90 pointer-events-none z-10" /> {/* Guide on top */}
                  {avatarSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={imgRef}
                      src={avatarSrc}
                      alt="crop source" // More descriptive alt
                      className="select-none absolute left-1/2 top-1/2 will-change-transform" // Added will-change
                      style={{
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${baseScale * scale})`,
                        cursor: dragging ? 'grabbing' : 'move', // Dynamic cursor
                      }}
                      // Removed inline event handlers, using parent div handlers instead
                       draggable="false" // Prevent native drag
                    />
                  )}
                </div>
                {/* Live circular preview */}
                <div className="flex flex-col items-center justify-center"> {/* Centering column */}
                  <div
                    ref={previewBoxRef}
                     // Responsive preview size using aspect ratio and max-width
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 relative border"
                  >
                    {avatarSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="crop preview" // More descriptive alt
                        className="absolute left-1/2 top-1/2 select-none"
                        style={{
                          transform: `translate(calc(-50% + ${offset.x * previewRatio}px), calc(-50% + ${offset.y * previewRatio}px)) scale(${baseScale * scale * previewRatio})`,
                          width: imgRef.current?.naturalWidth ? `${imgRef.current.naturalWidth}px` : 'auto', // Set explicit width/height for preview accuracy
                          height: imgRef.current?.naturalHeight ? `${imgRef.current.naturalHeight}px` : 'auto',
                        }}
                         draggable="false" // Prevent native drag
                      />
                    )}
                  </div>
                   <label htmlFor="zoom-slider" className="text-xs text-gray-500 mt-2">Zoom</label>
                </div>
              </div>
              {/* Zoom Slider */}
              <div className="mt-4">
                 <input
                   id="zoom-slider"
                   type="range"
                   min={1} // Min scale is 1 (base scale)
                   max={3} // Max zoom level
                   step={0.01}
                   value={scale}
                   onChange={(e) => setScale(Number(e.target.value))}
                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm dark:bg-gray-700" // Styled range input
                 />
              </div>
            </div>
            {/* Modal Actions */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="btn btn-ghost" // Use theme button
                onClick={() => {
                  setIsCropping(false);
                  if (avatarSrc) URL.revokeObjectURL(avatarSrc);
                  setAvatarSrc(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary" // Use theme button
                onClick={async () => {
                   if (!imgRef.current || !user || !avatarSrc) return;
                   const img = imgRef.current;
                   const canvas = document.createElement('canvas');
                   const targetSize = 256; // Target output size (can be adjusted)
                   canvas.width = targetSize;
                   canvas.height = targetSize;
                   const ctx = canvas.getContext('2d');
                   if (!ctx) {
                     alert("Could not process image.");
                     return;
                   }

                   // Calculate crop parameters based on current state
                   const totalScale = baseScale * scale;
                   const sourceX = (img.naturalWidth / 2) - (offset.x / totalScale) - (cropSize / (2 * totalScale));
                   const sourceY = (img.naturalHeight / 2) - (offset.y / totalScale) - (cropSize / (2 * totalScale));
                   const sourceSize = cropSize / totalScale;

                   // Draw the cropped area onto the canvas
                   ctx.drawImage(
                      img,
                      sourceX, sourceY, sourceSize, sourceSize, // Source rectangle (from original image)
                      0, 0, targetSize, targetSize // Destination rectangle (on canvas)
                    );


                   const blob: Blob | null = await new Promise((res) =>
                     canvas.toBlob(res, 'image/jpeg', 0.9), // Use JPEG format, adjust quality if needed
                   );
                   if (!blob) {
                      alert("Could not create image blob.");
                      return;
                   }

                   // Upload logic
                   const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'content';
                   const path = `${user.id}/avatar.jpg`; // Consistent path

                   try {
                     // Upsert directly, handles both new upload and replacement
                     const { error } = await supabaseClient.storage
                       .from(bucket)
                       .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '0' }); // Disable cache on upload

                     if (error) throw error; // Throw if upload fails

                     // Get a fresh URL (public or signed) to bypass cache
                     let freshUrl: string | null = null;
                      // Try public URL first if bucket is public
                      const { data: publicData } = supabaseClient.storage.from(bucket).getPublicUrl(path);
                      if (publicData?.publicUrl) {
                        freshUrl = `${publicData.publicUrl}?t=${Date.now()}`; // Add timestamp
                      } else {
                         // Fallback to signed URL if needed (e.g., private bucket)
                         const { data: signedData, error: signedError } = await supabaseClient.storage
                           .from(bucket)
                           .createSignedUrl(path, 60); // Short expiry for immediate use
                         if (!signedError && signedData?.signedUrl) {
                           freshUrl = signedData.signedUrl; // Signed URLs usually bypass cache better
                         }
                      }


                      if (freshUrl) {
                         setAvatarUrl(freshUrl); // Update UI immediately with the fresh URL
                         // Optionally update profile record in DB if you store avatar_url there
                          try {
                            await supabaseClient
                              .from('profiles')
                              .update({ avatar_url: freshUrl.split('?')[0] }) // Store base URL without timestamp
                              .eq('id', user.id);
                          } catch (dbError) {
                            console.warn("Failed to update profile record with new avatar URL:", dbError);
                          }
                      } else {
                         // Fallback if no URL could be generated, force reload or show generic path
                         setAvatarUrl(`${bucket}/${path}?t=${Date.now()}`); // Less reliable cache busting
                      }


                     setIsCropping(false); // Close modal on success

                   } catch (uploadError: any) {
                     console.error("Failed to upload avatar:", uploadError);
                     alert(`Failed to upload avatar: ${uploadError.message || 'Unknown error'}`);
                   } finally {
                      // Clean up object URL regardless of success/failure
                      if (avatarSrc) URL.revokeObjectURL(avatarSrc);
                      setAvatarSrc(null);
                   }
                 }}
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}