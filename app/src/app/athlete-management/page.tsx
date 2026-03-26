'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useDownload } from '@/contexts/DownloadContext';
import { Accomplishment, Profile } from '@/types';

interface AthleteData extends Profile {
  totalOrders?: number;
  lastOrderDate?: string;
  equipmentCount?: number;
  ordersLoaded?: boolean;
}

interface EditFormState {
  payment_amount: string;
  contract_duration_months: string;
  instagram_followers: string;
  tiktok_followers: string;
  youtube_followers: string;
  accomplishments: Accomplishment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val?: number | null) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-EU', { minimumFractionDigits: 2 })}`;
}

function formatNumber(val?: number | null) {
  if (val == null) return '—';
  const n = Number(val);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Athlete Stats Card ───────────────────────────────────────────────────────

interface AthleteStatsCardProps {
  athlete: AthleteData;
  session: any;
  canEdit: boolean;
  onEdit: (a: AthleteData) => void;
}

function AthleteStatsCard({ athlete, session, canEdit, onEdit }: AthleteStatsCardProps) {
  const [orders, setOrders] = useState<number | null>(athlete.totalOrders ?? null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current || athlete.role !== 'athlete') return;
    fetched.current = true;
    setOrdersLoading(true);
    const headers: Record<string, string> = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    fetch(`/api/analytics/my-stats?athlete_id=${athlete.id}`, { headers, cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) setOrders(json.total_orders ?? json.totalOrders ?? 0);
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [athlete.id, athlete.role, session]);

  const initials = athlete.name
    ? athlete.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  const totalFollowers =
    (athlete.instagram_followers ?? 0) +
    (athlete.tiktok_followers ?? 0) +
    (athlete.youtube_followers ?? 0);

  const hasFinancials = athlete.payment_amount != null;
  const hasSocial = totalFollowers > 0 || athlete.instagram_followers != null;
  const hasAccomplishments = (athlete.accomplishments ?? []).length > 0;

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[hsl(var(--foreground))] truncate">
            {athlete.name || 'Unnamed User'}
          </h3>
          <p className="text-sm text-[hsl(var(--muted))] truncate">{athlete.email}</p>
          <span
            className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-semibold
              ${athlete.role === 'athlete' ? 'badge-info' : athlete.role === 'manager' ? 'badge-success' : 'badge-warning'} badge`}
          >
            {athlete.role}
          </span>
        </div>
      </div>

      {/* Meta */}
      {(athlete.organization || athlete.city || athlete.country) && (
        <div className="px-5 pb-3 text-sm text-[hsl(var(--muted))] space-y-0.5">
          {athlete.organization && <div>{athlete.organization}</div>}
          {(athlete.city || athlete.country) && (
            <div>{[athlete.city, athlete.country].filter(Boolean).join(', ')}</div>
          )}
        </div>
      )}

      {/* Key stats row */}
      <div
        className="mx-5 mb-4 rounded-lg grid grid-cols-3 divide-x divide-[hsl(var(--border))]"
        style={{
          backgroundColor: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {/* Orders */}
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--info))' }}>
            {ordersLoading ? '…' : (orders ?? '—')}
          </span>
          <span className="text-xs text-[hsl(var(--muted))]">Orders</span>
        </div>
        {/* Payment */}
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--success))' }}>
            {athlete.payment_amount != null ? formatCurrency(athlete.payment_amount) : '—'}
          </span>
          <span className="text-xs text-[hsl(var(--muted))]">Pay / mo</span>
        </div>
        {/* Followers */}
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--warning))' }}>
            {totalFollowers > 0 ? formatNumber(totalFollowers) : '—'}
          </span>
          <span className="text-xs text-[hsl(var(--muted))]">Followers</span>
        </div>
      </div>

      {/* Social breakdown */}
      {hasSocial && (
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))] mb-2">
            Social Media
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-lg p-2 text-center"
              style={{ background: 'hsl(340 80% 20% / 0.4)', border: '1px solid hsl(340 60% 30% / 0.5)' }}
            >
              <div className="text-xs font-semibold" style={{ color: 'hsl(340 80% 75%)' }}>IG</div>
              <div className="text-sm font-bold text-[hsl(var(--foreground))]">
                {formatNumber(athlete.instagram_followers)}
              </div>
            </div>
            <div
              className="rounded-lg p-2 text-center"
              style={{ background: 'hsl(200 80% 20% / 0.4)', border: '1px solid hsl(200 60% 30% / 0.5)' }}
            >
              <div className="text-xs font-semibold" style={{ color: 'hsl(200 80% 75%)' }}>TT</div>
              <div className="text-sm font-bold text-[hsl(var(--foreground))]">
                {formatNumber(athlete.tiktok_followers)}
              </div>
            </div>
            <div
              className="rounded-lg p-2 text-center"
              style={{ background: 'hsl(0 80% 20% / 0.4)', border: '1px solid hsl(0 60% 30% / 0.5)' }}
            >
              <div className="text-xs font-semibold" style={{ color: 'hsl(0 80% 75%)' }}>YT</div>
              <div className="text-sm font-bold text-[hsl(var(--foreground))]">
                {formatNumber(athlete.youtube_followers)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accomplishments */}
      {hasAccomplishments && (
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))] mb-2">
            Achievements ({athlete.accomplishments!.length})
          </p>
          <div className="space-y-1">
            {athlete.accomplishments!.slice(0, 2).map((acc, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md px-3 py-2 text-sm"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              >
                <span style={{ color: 'hsl(var(--warning))' }}>🏆</span>
                <div className="min-w-0">
                  <div className="font-medium text-[hsl(var(--foreground))] truncate">{acc.title}</div>
                  {acc.date && (
                    <div className="text-xs text-[hsl(var(--muted))]">{acc.date}</div>
                  )}
                </div>
              </div>
            ))}
            {athlete.accomplishments!.length > 2 && (
              <div className="text-xs text-[hsl(var(--muted))] text-center pt-1">
                +{athlete.accomplishments!.length - 2} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* No data hint */}
      {!hasFinancials && !hasSocial && !hasAccomplishments && (
        <div className="px-5 pb-3 text-xs text-[hsl(var(--muted))] text-center italic">
          No stats recorded yet
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto px-5 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid hsl(var(--border))' }}
      >
        <span className="text-xs text-[hsl(var(--muted))]">
          Joined {athlete.created_at ? new Date(athlete.created_at).toLocaleDateString() : '—'}
        </span>
        {canEdit && (
          <button
            onClick={() => onEdit(athlete)}
            className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
            style={{
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--background))',
            }}
          >
            Edit Stats
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Edit Stats Modal ─────────────────────────────────────────────────────────

interface EditStatsModalProps {
  athlete: AthleteData;
  session: any;
  onClose: () => void;
  onSaved: (updated: Partial<AthleteData>) => void;
}

function EditStatsModal({ athlete, session, onClose, onSaved }: EditStatsModalProps) {
  const [form, setForm] = useState<EditFormState>({
    payment_amount: athlete.payment_amount != null ? String(athlete.payment_amount) : '',
    contract_duration_months: athlete.contract_duration_months != null ? String(athlete.contract_duration_months) : '',
    instagram_followers: athlete.instagram_followers != null ? String(athlete.instagram_followers) : '',
    tiktok_followers: athlete.tiktok_followers != null ? String(athlete.tiktok_followers) : '',
    youtube_followers: athlete.youtube_followers != null ? String(athlete.youtube_followers) : '',
    accomplishments: athlete.accomplishments ? [...athlete.accomplishments] : [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof EditFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addAccomplishment() {
    setForm((prev) => ({
      ...prev,
      accomplishments: [...prev.accomplishments, { title: '', date: '', description: '' }],
    }));
  }

  function updateAccomplishment(i: number, field: keyof Accomplishment, value: string) {
    setForm((prev) => ({
      ...prev,
      accomplishments: prev.accomplishments.map((a, idx) =>
        idx === i ? { ...a, [field]: value } : a,
      ),
    }));
  }

  function removeAccomplishment(i: number) {
    setForm((prev) => ({
      ...prev,
      accomplishments: prev.accomplishments.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };
      const body = {
        id: athlete.id,
        payment_amount: form.payment_amount !== '' ? parseFloat(form.payment_amount) : null,
        contract_duration_months: form.contract_duration_months !== '' ? parseInt(form.contract_duration_months) : null,
        instagram_followers: form.instagram_followers !== '' ? parseInt(form.instagram_followers) : null,
        tiktok_followers: form.tiktok_followers !== '' ? parseInt(form.tiktok_followers) : null,
        youtube_followers: form.youtube_followers !== '' ? parseInt(form.youtube_followers) : null,
        accomplishments: form.accomplishments,
      };
      const res = await fetch('/api/profiles/update', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onSaved({
          payment_amount: body.payment_amount,
          contract_duration_months: body.contract_duration_months,
          instagram_followers: body.instagram_followers,
          tiktok_followers: body.tiktok_followers,
          youtube_followers: body.youtube_followers,
          accomplishments: body.accomplishments,
        });
        onClose();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Failed to save.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const label = (text: string) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))', display: 'block', marginBottom: 3 }}>
      {text}
    </span>
  );

  const sectionTitle = (text: string) => (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      color: 'hsl(var(--muted))', marginBottom: 8, marginTop: 16,
      borderBottom: '1px solid hsl(var(--border))', paddingBottom: 4,
    }}>
      {text}
    </p>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 16px',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid hsl(var(--border))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              Edit Athlete Stats
            </h2>
            <p style={{ fontSize: 13, color: 'hsl(var(--muted))', marginTop: 2 }}>
              {athlete.name || athlete.email}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'hsl(var(--muted))', fontSize: 20, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSave} style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {error && (
            <div
              style={{
                padding: '8px 12px', borderRadius: 6, marginBottom: 12,
                background: 'hsl(0 60% 20%)', color: 'hsl(0 80% 82%)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Financials */}
          {sectionTitle('Financials')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label('Payment Amount (€/mo)')}
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1500"
                value={form.payment_amount}
                onChange={(e) => setField('payment_amount', e.target.value)}
              />
            </div>
            <div>
              {label('Contract Duration (months)')}
              <input
                style={inputStyle}
                type="number"
                min="1"
                placeholder="e.g. 12"
                value={form.contract_duration_months}
                onChange={(e) => setField('contract_duration_months', e.target.value)}
              />
            </div>
          </div>

          {/* Social Media */}
          {sectionTitle('Social Media Followers')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              {label('Instagram')}
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="e.g. 45000"
                value={form.instagram_followers}
                onChange={(e) => setField('instagram_followers', e.target.value)}
              />
            </div>
            <div>
              {label('TikTok')}
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="e.g. 20000"
                value={form.tiktok_followers}
                onChange={(e) => setField('tiktok_followers', e.target.value)}
              />
            </div>
            <div>
              {label('YouTube')}
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="e.g. 5000"
                value={form.youtube_followers}
                onChange={(e) => setField('youtube_followers', e.target.value)}
              />
            </div>
          </div>

          {/* Accomplishments */}
          {sectionTitle('Achievements')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.accomplishments.map((acc, i) => (
              <div
                key={i}
                style={{
                  padding: '12px', borderRadius: 8,
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    {label('Title')}
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Championship name"
                      value={acc.title}
                      onChange={(e) => updateAccomplishment(i, 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    {label('Date')}
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="e.g. 2024-03"
                      value={acc.date}
                      onChange={(e) => updateAccomplishment(i, 'date', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  {label('Description')}
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Brief description"
                    value={acc.description}
                    onChange={(e) => updateAccomplishment(i, 'description', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAccomplishment(i)}
                  style={{
                    fontSize: 12, padding: '3px 10px', borderRadius: 5,
                    background: 'hsl(0 60% 25%)', color: 'hsl(0 80% 82%)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAccomplishment}
              style={{
                fontSize: 13, padding: '7px 14px', borderRadius: 6,
                border: '1px dashed hsl(var(--border))',
                background: 'transparent',
                color: 'hsl(var(--muted))',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Add Achievement
            </button>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex', gap: 8, justifyContent: 'flex-end',
              marginTop: 20, paddingTop: 16, borderTop: '1px solid hsl(var(--border))',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 7, fontSize: 14,
                border: '1px solid hsl(var(--border))',
                background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px', borderRadius: 7, fontSize: 14, fontWeight: 600,
                background: 'hsl(var(--foreground))', color: 'hsl(var(--background))',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Stats'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AthleteManagementPage() {
  const { profile, session } = useAuth();
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteData | null>(null);

  const hasPermission =
    profile?.role === 'manager' || profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    setIsDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  }, []);

  const fetchAthletes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const response = await fetch(`/api/profiles/list?${params}`, {
        headers,
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
          postal_code: p.postal_code || '',
          country: p.country || '',
          created_at: p.created_at,
          updated_at: p.updated_at,
          manager_id: p.manager_id,
          admin_id: p.admin_id,
          payment_amount: p.payment_amount ?? null,
          contract_duration_months: p.contract_duration_months ?? null,
          instagram_followers: p.instagram_followers ?? null,
          tiktok_followers: p.tiktok_followers ?? null,
          youtube_followers: p.youtube_followers ?? null,
          accomplishments: p.accomplishments ?? null,
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
  }, [currentPage, session]);

  useEffect(() => {
    if (hasPermission) {
      fetchAthletes();
    }
  }, [hasPermission, fetchAthletes]);

  useEffect(() => {
    let filtered = [...athletes];

    if (roleFilter !== 'all') {
      filtered = filtered.filter((athlete) => athlete.role === roleFilter);
    }

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

  function handleEditSaved(athleteId: string, updated: Partial<AthleteData>) {
    setAthletes((prev) =>
      prev.map((a) => (a.id === athleteId ? { ...a, ...updated } : a)),
    );
  }

  const exportAthletesData = () => {
    if (athletes.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Name', 'Email', 'Role', 'Organization', 'Phone',
      'Payment Amount', 'Instagram Followers', 'TikTok Followers', 'YouTube Followers',
      'Achievements', 'Joined Date',
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
          athlete.payment_amount ?? '',
          athlete.instagram_followers ?? '',
          athlete.tiktok_followers ?? '',
          athlete.youtube_followers ?? '',
          `"${(athlete.accomplishments ?? []).map((a) => a.title).join('; ')}"`,
          `"${athlete.created_at ? new Date(athlete.created_at).toLocaleDateString() : ''}"`,
        ].join(','),
      ),
    ].join('\n');

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
    <ProtectedRoute requiredRole={['admin', 'manager', 'superadmin']}>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Athlete Management
          </h1>
          <p className="text-[hsl(var(--muted))]">
            Manage athletes, track their stats, social reach, and achievements
          </p>

          {isDemoMode && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                Demo Mode Active
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--muted))' }}>
                Running with sample data. Configure Supabase environment variables to connect to a real database.
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {totalAthletes}
            </div>
            <div className="text-sm text-[hsl(var(--muted))]">Total Users</div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--success) / 0.08)',
              borderColor: 'hsl(var(--success) / 0.3)',
            }}
          >
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'athlete').length}
            </div>
            <div className="text-sm" style={{ color: 'hsl(var(--success))' }}>Athletes</div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--warning) / 0.1)',
              borderColor: 'hsl(var(--warning) / 0.3)',
            }}
          >
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'manager').length}
            </div>
            <div className="text-sm" style={{ color: 'hsl(var(--warning))' }}>Managers</div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2">
              {athletes.filter((a) => a.role === 'admin').length}
            </div>
            <div className="text-sm text-[hsl(var(--muted))]">Administrators</div>
          </div>
        </div>

        {/* Controls */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[hsl(var(--muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 pr-10 py-2"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-[hsl(var(--muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

              {(searchTerm || roleFilter !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
                  className="px-4 py-2 rounded-lg transition-colors flex items-center"
                  style={{ color: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* View Mode & Export */}
            <div className="flex items-center space-x-4">
              <button
                onClick={exportAthletesData}
                className="btn-approve px-4 py-2 text-sm rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-[hsl(var(--muted))]">View:</span>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted))]'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--secondary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted))]'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-[hsl(var(--muted))]">
            <div>
              Showing {filteredAthletes.length} of {totalAthletes} users
              {searchTerm && <span className="ml-2 text-[hsl(var(--foreground))]">for "{searchTerm}"</span>}
              {roleFilter !== 'all' && <span className="ml-2 text-[hsl(var(--foreground))]">in {roleFilter} role</span>}
            </div>
            <button
              onClick={fetchAthletes}
              className="px-3 py-1 transition-colors flex items-center"
              style={{ color: 'hsl(var(--muted))' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center px-4 py-2 font-semibold text-[hsl(var(--muted))]">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" style={{ color: 'hsl(var(--muted))' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading athletes...
              </div>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">No athletes found</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted))]">
                {searchTerm || roleFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'No athletes have been added yet.'}
              </p>
              {(searchTerm || roleFilter !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md btn"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAthletes.map((athlete) => (
                    <AthleteStatsCard
                      key={athlete.id}
                      athlete={athlete}
                      session={session}
                      canEdit={hasPermission}
                      onEdit={setEditingAthlete}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                    <thead style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                      <tr>
                        {['User', 'Role', 'Organization', 'Payment', 'Followers', 'Achievements', 'Actions'].map((col) => (
                          <th key={col} className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
                      {filteredAthletes.map((athlete) => (
                        <tr key={athlete.id} className="hover:opacity-95">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'hsl(var(--border))' }}
                              >
                                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  {athlete.name ? athlete.name.split(' ').map((n: string) => n[0]).join('') : 'A'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-[hsl(var(--foreground))]">{athlete.name || 'Unnamed User'}</div>
                                <div className="text-sm text-[hsl(var(--muted))]">{athlete.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${athlete.role === 'athlete' ? 'badge-info' : athlete.role === 'manager' ? 'badge-success' : 'badge-warning'}`}>
                              {athlete.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {athlete.organization || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            {formatCurrency(athlete.payment_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                            <div className="space-y-0.5">
                              {athlete.instagram_followers != null && (
                                <div><span className="text-xs text-[hsl(var(--muted))]">IG </span>{formatNumber(athlete.instagram_followers)}</div>
                              )}
                              {athlete.tiktok_followers != null && (
                                <div><span className="text-xs text-[hsl(var(--muted))]">TT </span>{formatNumber(athlete.tiktok_followers)}</div>
                              )}
                              {athlete.youtube_followers != null && (
                                <div><span className="text-xs text-[hsl(var(--muted))]">YT </span>{formatNumber(athlete.youtube_followers)}</div>
                              )}
                              {athlete.instagram_followers == null && athlete.tiktok_followers == null && athlete.youtube_followers == null && '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[hsl(var(--foreground))]">
                            {(athlete.accomplishments ?? []).length > 0
                              ? `${athlete.accomplishments!.length} achievement${athlete.accomplishments!.length !== 1 ? 's' : ''}`
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setEditingAthlete(athlete)}
                              className="hover:opacity-80"
                              style={{ color: 'hsl(var(--info))' }}
                            >
                              Edit Stats
                            </button>
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
                    Page {currentPage} of {totalPages} ({totalAthletes} total)
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--secondary))' }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--secondary))' }}
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

      {/* Edit Stats Modal */}
      {editingAthlete && (
        <EditStatsModal
          athlete={editingAthlete}
          session={session}
          onClose={() => setEditingAthlete(null)}
          onSaved={(updated) => {
            handleEditSaved(editingAthlete.id, updated);
            setEditingAthlete(null);
          }}
        />
      )}
    </ProtectedRoute>
  );
}
