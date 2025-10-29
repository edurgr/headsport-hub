'use client';

import { useCallback, useEffect, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useDownload } from '@/contexts/DownloadContext';
import { Profile } from '@/types';

interface AthleteData extends Profile {
  totalOrders?: number;
  lastOrderDate?: string;
  equipmentCount?: number;
}

export default function AthleteManagementPage() {
  const { profile } = useAuth();
  const download = useDownload();
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAthletes, setTotalAthletes] = useState(0);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Check if user has permission to access this page
  const hasPermission = profile?.role === 'manager' || profile?.role === 'admin';

  const fetchAthletes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      const response = await fetch(`/api/profiles/list?${params}`, {
        cache: 'no-store',
        redirect: 'follow',
      });
      const data = await response.json();

      if (data.success) {
        const mapped: AthleteData[] = (data.profiles || []).map((p: any) => ({
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
          totalOrders: 0,
          equipmentCount: 0,
          lastOrderDate: null,
        }));

        setAthletes(mapped);
        setTotalPages(data.pagination.totalPages);
        setTotalAthletes(data.pagination.total);
      } else {
        console.error('Failed to fetch athletes:', data.error);
        setAthletes([]);
        setTotalPages(1);
        setTotalAthletes(0);
      }
    } catch (error) {
      console.error('Error fetching athletes:', error);
      setAthletes([]);
      setTotalPages(1);
      setTotalAthletes(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (hasPermission) {
      fetchAthletes();
    }
  }, [hasPermission, fetchAthletes]);

  // Filter athletes based on search term and role filter
  useEffect(() => {
    let filtered = [...athletes];

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((athlete) => athlete.role === roleFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (athlete) =>
          athlete.name?.toLowerCase().includes(searchLower) ||
          (athlete.email?.toLowerCase() || '').includes(searchLower) ||
          athlete.organization?.toLowerCase().includes(searchLower) ||
          athlete.phone?.toLowerCase().includes(searchLower),
      );
    }

    setFilteredAthletes(filtered);
  }, [athletes, searchTerm, roleFilter]);

  // Role colors handled via badge tokens in UI

  const exportAthletesData = () => {
    if (athletes.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Name',
      'Email',
      'Role',
      'Organization',
      'Phone',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Total Orders',
      'Equipment Count',
      'Last Order Date',
      'Joined Date',
    ];

    const csvContent = [
      headers.join(','),
      ...athletes.map((athlete) =>
        [
          `"${athlete.name || ''}"`,
          `"${athlete.email || ''}"`,
          `"${athlete.role || ''}"`,
          `"${athlete.organization || ''}"`,
          `"${athlete.phone || ''}"`,
          `"${athlete.address || ''}"`,
          `"${athlete.city || ''}"`,
          `"${athlete.state || ''}"`,
          `"${athlete.postal_code || ''}"`,
          `"${athlete.country || ''}"`,
          athlete.totalOrders || 0,
          athlete.equipmentCount || 0,
          `"${athlete.lastOrderDate ? new Date(athlete.lastOrderDate).toLocaleDateString() : ''}"`,
          `"${athlete.created_at ? new Date(athlete.created_at).toLocaleDateString() : ''}"`,
        ].join(','),
      ),
    ].join('\n');

    // Create and download file
    download.begin('Preparing athletes CSV…');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `athletes_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    download.end();
  };

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Access Denied</h1>
          <p className="text-[hsl(var(--muted))]">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Athlete Management
          </h1>
          <p className="text-[hsl(var(--muted))]">
            Manage and monitor all athletes in the platform
          </p>

          {/* Demo Mode Notice */}
          {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  style={{ color: 'hsl(var(--info))' }}
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
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    Demo Mode Active
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted))' }}>
                    Running with sample data. Configure Supabase environment variables to connect to
                    a real database.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--border))' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'hsl(var(--foreground))' }}
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
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {totalAthletes}
            </div>
            <div className="text-sm text-[hsl(var(--muted))]">Total Athletes</div>
            <div className="text-xs text-[hsl(var(--muted))]">All platform users</div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--success) / 0.08)',
              borderColor: 'hsl(var(--success) / 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--success) / 0.15)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'hsl(var(--success))' }}
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
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'athlete').length}
            </div>
            <div className="text-sm" style={{ color: 'hsl(var(--success))' }}>
              Active Athletes
            </div>
            <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
              Competition ready
            </div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--warning) / 0.1)',
              borderColor: 'hsl(var(--warning) / 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--warning) / 0.15)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'hsl(var(--warning))' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'manager').length}
            </div>
            <div className="text-sm" style={{ color: 'hsl(var(--warning))' }}>
              Managers
            </div>
            <div className="text-xs" style={{ color: 'hsl(var(--warning))' }}>
              Team leaders
            </div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--border))' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'hsl(var(--foreground))' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'admin').length}
            </div>
            <div className="text-sm text-[hsl(var(--muted))]">Administrators</div>
            <div className="text-xs text-[hsl(var(--muted))]">Platform admins</div>
          </div>
        </div>

        {/* Controls */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
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
                  placeholder="Search athletes by name, email, organization, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 pr-10 py-2"
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

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input min-w-[150px]"
              >
                <option value="all">All Roles</option>
                <option value="athlete">Athletes</option>
                <option value="manager">Managers</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Clear Filters Button */}
              {(searchTerm || roleFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('all');
                  }}
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
            </div>

            {/* View Mode Toggle and Export */}
            <div className="flex items-center space-x-4">
              {/* Export Button */}
              <button
                onClick={() => exportAthletesData()}
                className="btn-approve px-4 py-2 text-sm rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[hsl(var(--muted))]">View:</span>
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted))] hover:opacity-80'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted))] hover:opacity-80'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results Summary */}
          <div className="flex items-center justify-between text-sm text-[hsl(var(--muted))]">
            <div>
              Showing {filteredAthletes.length} of {totalAthletes} athletes
              {searchTerm && (
                <span className="ml-2 text-[hsl(var(--foreground))]">for "{searchTerm}"</span>
              )}
              {roleFilter !== 'all' && (
                <span className="ml-2 text-[hsl(var(--foreground))]">in {roleFilter} role</span>
              )}
            </div>

            <button
              onClick={fetchAthletes}
              className="px-3 py-1 transition-colors flex items-center"
              style={{ color: 'hsl(var(--muted))' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-[hsl(var(--muted))]">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-"
                  style={{ color: 'hsl(var(--muted))' }}
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
                Loading athletes...
              </div>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-[hsl(var(--muted))]"
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
              <h3 className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">
                No athletes found
              </h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted))]">
                {searchTerm || roleFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'No athletes have been added yet.'}
              </p>
              {searchTerm || roleFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('all');
                  }}
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md btn"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAthletes.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="p-6 rounded-lg border hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: 'hsl(var(--secondary))',
                        borderColor: 'hsl(var(--border))',
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'hsl(var(--border))' }}
                          >
                            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {athlete.name
                                ? athlete.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                : 'A'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                              {athlete.name || 'Unnamed User'}
                            </h3>
                            <p className="text-[hsl(var(--muted))]">{athlete.email}</p>
                            <span
                              className={`badge ${athlete.role === 'athlete' ? 'badge-info' : athlete.role === 'manager' ? 'badge-success' : 'badge-warning'}`}
                            >
                              {athlete.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {athlete.organization && (
                        <div className="text-sm text-[hsl(var(--muted))] mb-3">
                          <span className="font-medium">Organization:</span> {athlete.organization}
                        </div>
                      )}

                      {(athlete.city || athlete.country) && (
                        <div className="text-sm text-[hsl(var(--muted))] mb-3">
                          <span className="font-medium">Location:</span> {athlete.city},{' '}
                          {athlete.country}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-[hsl(var(--muted))]">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Joined{' '}
                        {athlete.created_at
                          ? new Date(athlete.created_at).toLocaleDateString()
                          : 'Unknown'}
                      </div>

                      {/* Stats */}
                      <div
                        className="grid grid-cols-2 gap-2 pt-2"
                        style={{ borderTop: '1px solid hsl(var(--border))' }}
                      >
                        <div className="text-center">
                          <div
                            className="text-lg font-semibold"
                            style={{ color: 'hsl(var(--info))' }}
                          >
                            {athlete.totalOrders || 0}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted))]">Orders</div>
                        </div>
                        <div className="text-center">
                          <div
                            className="text-lg font-semibold"
                            style={{ color: 'hsl(var(--success))' }}
                          >
                            {athlete.equipmentCount || 0}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted))]">Equipment</div>
                        </div>
                      </div>

                      {athlete.lastOrderDate && (
                        <div className="text-xs text-[hsl(var(--muted))] text-center pt-1">
                          Last order: {new Date(athlete.lastOrderDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    className="min-w-full divide-y"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <thead style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Equipment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Last Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className="divide-y"
                      style={{
                        backgroundColor: 'hsl(var(--secondary))',
                        borderColor: 'hsl(var(--border))',
                      }}
                    >
                      {filteredAthletes.map((athlete) => (
                        <tr key={athlete.id} className="hover:opacity-95">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'hsl(var(--border))' }}
                              >
                                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  {athlete.name
                                    ? athlete.name
                                        .split(' ')
                                        .map((n: string) => n[0])
                                        .join('')
                                    : 'A'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  {athlete.name || 'Unnamed User'}
                                </div>
                                <div className="text-sm text-[hsl(var(--muted))]">
                                  {athlete.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`badge ${athlete.role === 'athlete' ? 'badge-info' : athlete.role === 'manager' ? 'badge-success' : 'badge-warning'}`}
                            >
                              {athlete.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowactrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.organization || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.phone || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.city && athlete.country
                              ? `${athlete.city}, ${athlete.country}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            <span className="font-medium" style={{ color: 'hsl(var(--info))' }}>
                              {athlete.totalOrders || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            <span className="font-medium" style={{ color: 'hsl(var(--success))' }}>
                              {athlete.equipmentCount || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.lastOrderDate
                              ? new Date(athlete.lastOrderDate).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.created_at
                              ? new Date(athlete.created_at).toLocaleDateString()
                              : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedAthlete(athlete);
                                  setShowProfileModal(true);
                                }}
                                className="hover:opacity-80"
                                style={{ color: 'hsl(var(--info))' }}
                              >
                                View
                              </button>
                              <button
                                className="hover:opacity-80"
                                style={{ color: 'hsl(var(--muted))' }}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <div className="text-sm text-[hsl(var(--muted))]">
                    Showing page {currentPage} of {totalPages} ({totalAthletes} total athletes)
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--secondary))',
                      }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                        backgroundColor: 'hsl(var(--secondary))',
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}