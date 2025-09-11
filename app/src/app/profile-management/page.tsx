'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';
import { Profile } from '@/types';

// Unified management hub: Profiles (admins/managers), Invitations (admins), Admin creation (admins)

export default function ProfileManagementPage() {
  const { profile, signUpWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState<'profiles' | 'admins'>('profiles');

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [recentUploadsByUser, setRecentUploadsByUser] = useState<Record<string, any[]>>({});

  // Athlete editing state
  const [editingAthlete, setEditingAthlete] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    // Performance metrics
    expectedContentUploads: '',
    costPerAthlete: '',
    competitionPerformance: '',
    festivalAchievements: '',
    awards: '',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Admin creation state (admins only)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<string | null>(null);

  // Delete user state
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      fetchProfiles();
    }
  }, [profile]);

  // Filter profiles based on search term and role filter
  useEffect(() => {
    let filtered = [...profiles];

    // For managers: only show athletes and their own profile (no admins)
    // For admins: show all profiles
    if (profile?.role === 'manager') {
      filtered = filtered.filter((p) => p.role === 'athlete' || p.id === profile.id);
    }
    // Admins can see all profiles, no additional filtering needed

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((profile) => profile.role === roleFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.name?.toLowerCase().includes(searchLower) ||
          profile.email.toLowerCase().includes(searchLower) ||
          profile.organization?.toLowerCase().includes(searchLower) ||
          profile.phone?.toLowerCase().includes(searchLower),
      );
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, roleFilter, profile]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '1000');
      // Use current filters when fetching
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`/api/profiles/list?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
        redirect: 'follow',
      });
      const result = await response.json();

      if (response.ok && result.success) {
        const mapped: Profile[] = (result.profiles || []).map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          organization: p.organization || '',
          phone: p.phone || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          postal_code: p.postalCode || '',
          country: p.country || '',
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        }));
        setProfiles(mapped);
        // Preload recent uploads for first page of profiles (best-effort)
        preloadRecentUploads(mapped.slice(0, 10));
      } else {
        console.error('Failed to fetch profiles:', result.error);
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  async function preloadRecentUploads(list: Profile[]) {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;
      const entries = await Promise.all(
        list.map(async (p) => {
          const params = new URLSearchParams();
          params.set('limit', '6');
          params.set('user_id', p.id);
          const res = await fetch(`/api/content/gallery?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: 'no-store',
            redirect: 'follow',
          });
          const json = await res.json();
          return [p.id, res.ok ? json.items || [] : []] as const;
        }),
      );
      const map: Record<string, any[]> = {};
      for (const [id, items] of entries) map[id] = items;
      setRecentUploadsByUser(map);
    } catch (e) {
      // ignore
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for search
    const timeout = setTimeout(() => {
      // Search is handled by useEffect
    }, 300);
    setSearchTimeout(timeout);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
  };

  const handleDeleteUser = async (userProfile: Profile) => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: userProfile.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAdminInfo(`User ${userProfile.email} deleted successfully`);
        setDeleteConfirm(null);
        fetchProfiles(); // Refresh the list
      } else {
        setDeleteError(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setDeleteError('Error deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Admin creation handler
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminInfo(null);
    setAdminLoading(true);
    try {
      const { requiresEmailConfirmation } = await signUpWithEmail(
        adminEmail,
        adminPassword,
        adminName || undefined,
      );
      if (requiresEmailConfirmation) {
        setAdminInfo('Check the email inbox to confirm the new administrator account.');
      } else {
        setAdminInfo('Administrator account created successfully.');
      }
      setAdminEmail('');
      setAdminPassword('');
      setAdminName('');
    } catch (err: any) {
      setAdminError(err?.message || 'Could not create administrator account.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Profile editing handlers
  const openEditAthlete = (profileToEdit: Profile) => {
    setEditingAthlete(profileToEdit);
    setEditForm({
      name: profileToEdit.name || '',
      email: profileToEdit.email || '',
      phone: profileToEdit.phone || '',
      organization: profileToEdit.organization || '',
      expectedContentUploads: (profileToEdit as any).expectedContentUploads || '',
      costPerAthlete: (profileToEdit as any).costPerAthlete || '',
      competitionPerformance: (profileToEdit as any).competitionPerformance || '',
      festivalAchievements: (profileToEdit as any).festivalAchievements || '',
      awards: (profileToEdit as any).awards || '',
      notes: (profileToEdit as any).notes || '',
    });
    setEditError(null);
    setEditSuccess(null);
  };

  const closeEditAthlete = () => {
    setEditingAthlete(null);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      organization: '',
      expectedContentUploads: '',
      costPerAthlete: '',
      competitionPerformance: '',
      festivalAchievements: '',
      awards: '',
      notes: '',
    });
    setEditError(null);
    setEditSuccess(null);
  };

  const handleEditAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAthlete) return;

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch('/api/profiles/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingAthlete.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          organization: editForm.organization,
          // Performance metrics
          expectedContentUploads: editForm.expectedContentUploads,
          costPerAthlete: editForm.costPerAthlete,
          competitionPerformance: editForm.competitionPerformance,
          festivalAchievements: editForm.festivalAchievements,
          awards: editForm.awards,
          notes: editForm.notes,
        }),
      });

      if (response.ok) {
        setEditSuccess(
          `${
            editingAthlete.role === 'athlete'
              ? 'Athlete'
              : editingAthlete.role === 'manager'
                ? 'Manager'
                : editingAthlete.role === 'admin'
                  ? 'Administrator'
                  : 'User'
          } profile updated successfully`,
        );
        await fetchProfiles(); // Refresh the profiles list
        setTimeout(() => {
          closeEditAthlete();
        }, 1500);
      } else {
        const errorData = await response.json();
        setEditError(errorData.error || `Failed to update ${editingAthlete.role} profile`);
      }
    } catch (err: any) {
      setEditError(err?.message || `Failed to update ${editingAthlete.role} profile`);
    } finally {
      setEditLoading(false);
    }
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return (
      <ProtectedRoute requiredRole={['admin', 'manager']}>
        <div>Access Denied</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Profile Management
          </h1>
          <p className="text-[hsl(var(--muted))]">
            {profile?.role === 'admin'
              ? 'Manage users, invitations, and administrators'
              : 'Manage athletes and your profile'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-[hsl(var(--border))]">
          <nav className="-mb-px flex space-x-6">
            <button
              className={`px-1 pb-2 border-b-2 text-sm font-medium ${activeTab === 'profiles' ? 'border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]' : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}
              onClick={() => setActiveTab('profiles')}
            >
              Profiles
            </button>
            {profile?.role === 'admin' && (
              <button
                className={`px-1 pb-2 border-b-2 text-sm font-medium ${activeTab === 'admins' ? 'border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]' : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}
                onClick={() => setActiveTab('admins')}
              >
                Admins
              </button>
            )}
          </nav>
        </div>

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <>
            <div className="card p-6 mb-8">
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-[hsl(var(--muted))]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search profiles by name, email, organization, or phone..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="input pl-10 pr-4 py-2"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-[hsl(var(--muted))] hover:opacity-80"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <select
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  className="input min-w-[150px]"
                >
                  <option value="all">All Roles</option>
                  <option value="athlete">Athletes</option>
                  {profile?.role === 'admin' && (
                    <>
                      <option value="manager">Managers</option>
                      <option value="admin">Admins</option>
                    </>
                  )}
                  {profile?.role === 'manager' && <option value="manager">Managers</option>}
                </select>

                {(searchTerm || roleFilter !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center"
                    style={{ color: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Clear
                  </button>
                )}

                {profile?.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admins')}
                    className="btn px-6 py-2 rounded-lg font-medium flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Invite User
                  </button>
                )}
                {profile?.role === 'manager' && (
                  <a
                    href="/invite-manager"
                    className="btn px-6 py-2 rounded-lg font-medium flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Invite Athlete
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-[hsl(var(--muted))]">
                <div>
                  Showing {filteredProfiles.length} of {profiles.length} profiles
                  {searchTerm && (
                    <span className="ml-2 text-[hsl(var(--foreground))]">for "{searchTerm}"</span>
                  )}
                  {roleFilter !== 'all' && (
                    <span className="ml-2 text-[hsl(var(--foreground))]">in {roleFilter} role</span>
                  )}
                </div>
                <button
                  onClick={fetchProfiles}
                  className="px-3 py-1 transition-colors flex items-center"
                  style={{ color: 'hsl(var(--muted))' }}
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-600">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600"
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
                    Loading profiles...
                  </div>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No profiles found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || roleFilter !== 'all'
                      ? 'Try adjusting your search terms or filters.'
                      : 'No users have been added yet.'}
                  </p>
                  {searchTerm || roleFilter !== 'all' ? (
                    <button
                      onClick={clearFilters}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      Clear all filters
                    </button>
                  ) : null}
                </div>
              ) : (
                filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-500"
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
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                          <p className="text-gray-600">{p.email}</p>
                          <p className="text-sm text-gray-500">{p.organization}</p>
                          {p.role === 'athlete' && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {(p as any).expectedContentUploads && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                  Expected: {(p as any).expectedContentUploads} uploads
                                </span>
                              )}
                              {(p as any).costPerAthlete && (
                                <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                                  Cost: €{(p as any).costPerAthlete}
                                </span>
                              )}
                              {(p as any).competitionPerformance && (
                                <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                                  Performance: {(p as any).competitionPerformance}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            p.role === 'athlete'
                              ? 'bg-blue-100 text-blue-800'
                              : p.role === 'manager'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {p.role}
                        </span>
                        {(profile?.role === 'manager' && p.role === 'athlete') ||
                          (profile?.role === 'admin' && p.role !== 'admin' && (
                            <button
                              onClick={() => openEditAthlete(p)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                          ))}
                        {profile?.role === 'admin' && p.role !== 'admin' && (
                          <button
                            onClick={() => setDeleteConfirm(p)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            title="Delete user"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Recent uploads</h4>
                      <div className="grid grid-cols-6 gap-2">
                        {(recentUploadsByUser[p.id] || []).slice(0, 6).map((it: any) => (
                          <a
                            key={it.id}
                            href="/content"
                            className="block aspect-video bg-gray-100 overflow-hidden rounded relative"
                          >
                            {it.thumbnail_url ? (
                              <Image
                                src={it.thumbnail_url}
                                alt={it.filename}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 33vw, 20vw"
                              />
                            ) : it.url ? (
                              it.file_type === 'image' ? (
                                <Image
                                  src={it.url}
                                  alt={it.filename}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 33vw, 20vw"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                  {it.file_type}
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                —
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'admins' && profile?.role === 'admin' && (
          <div className="max-w-xl">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create Administrator Account
              </h2>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Administrator name"
                    type="text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                    type="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    type="password"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
                {adminError && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                    {adminError}
                  </div>
                )}
                {adminInfo && (
                  <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                    {adminInfo}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={adminLoading}
                  className={`w-full py-2.5 rounded-md text-white font-medium ${adminLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {adminLoading
                    ? 'Creating Administrator Account…'
                    : 'Create Administrator Account'}
                </button>
              </form>
              <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm text-blue-800">
                  <div className="flex items-center mb-1">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">Administrator Registration</span>
                  </div>
                  <ul className="text-xs space-y-1 ml-6">
                    <li>• Only existing administrators can create new admin accounts</li>
                    <li>• New administrators will have full system access</li>
                    <li>• Email confirmation is required after registration</li>
                    <li>• For other users, use the invitation system</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Athlete Edit Modal */}
        {editingAthlete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Edit{' '}
                    {editingAthlete?.role === 'athlete'
                      ? 'Athlete'
                      : editingAthlete?.role === 'manager'
                        ? 'Manager'
                        : editingAthlete?.role === 'admin'
                          ? 'Administrator'
                          : 'User'}{' '}
                    Profile
                  </h2>
                  <button onClick={closeEditAthlete} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditAthlete} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={editForm.organization}
                        onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Performance Metrics - Only for Athletes */}
                  {editingAthlete?.role === 'athlete' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Performance Metrics
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Content Uploads
                          </label>
                          <input
                            type="number"
                            value={editForm.expectedContentUploads}
                            onChange={(e) =>
                              setEditForm({ ...editForm, expectedContentUploads: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cost per Athlete (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.costPerAthlete}
                            onChange={(e) =>
                              setEditForm({ ...editForm, costPerAthlete: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 2500.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Competition Performance
                          </label>
                          <select
                            value={editForm.competitionPerformance}
                            onChange={(e) =>
                              setEditForm({ ...editForm, competitionPerformance: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select performance level</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Professional">Professional</option>
                            <option value="Elite">Elite</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Festival Achievements
                          </label>
                          <input
                            type="text"
                            value={editForm.festivalAchievements}
                            onChange={(e) =>
                              setEditForm({ ...editForm, festivalAchievements: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 1st place, 2023 Festival"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Awards & Recognition
                        </label>
                        <input
                          type="text"
                          value={editForm.awards}
                          onChange={(e) => setEditForm({ ...editForm, awards: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Best Newcomer 2023, Rising Star Award"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional notes about the athlete..."
                        />
                      </div>
                    </div>
                  )}

                  {editError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                      {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                      {editSuccess}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={closeEditAthlete}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className={`px-4 py-2 rounded-md text-white font-medium ${
                        editLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm User Deletion
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the user <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})?
                <br />
                <span className="text-red-600 font-medium">
                  This action cannot be undone and will permanently delete the user account and all associated data.
                </span>
              </p>
              
              {deleteError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mb-4">
                  {deleteError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
