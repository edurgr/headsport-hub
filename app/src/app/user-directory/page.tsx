'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Accomplishment, Invitation, Profile } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileStats {
  totalContent: number;
  totalOrders: number;
}

interface EditFormState {
  name: string;
  email: string;
  phone: string;
  organization: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  payment_amount: string;
  contract_duration_months: string;
  instagram_followers: string;
  tiktok_followers: string;
  youtube_followers: string;
  accomplishments: Accomplishment[];
}

interface AssignmentRow {
  profileId: string;
  assignToId: string;
  saving: boolean;
  error: string | null;
  success: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold';
  switch (role) {
    case 'superadmin':
      return `${base} bg-[hsl(var(--purple-bg,270_70%_20%))] text-[hsl(var(--purple-fg,270_80%_80%))]`;
    case 'admin':
      return `${base} bg-[hsl(var(--red-bg,0_70%_20%))] text-[hsl(var(--red-fg,0_80%_80%))]`;
    case 'manager':
      return `${base} bg-[hsl(var(--blue-bg,220_70%_20%))] text-[hsl(var(--blue-fg,220_80%_80%))]`;
    case 'athlete':
      return `${base} bg-[hsl(var(--green-bg,140_60%_18%))] text-[hsl(var(--green-fg,140_70%_70%))]`;
    default:
      return `${base} bg-[hsl(var(--muted-bg,0_0%_20%))] text-[hsl(var(--muted))]`;
  }
}

function roleBadgeInline(role: string) {
  const styles: Record<string, React.CSSProperties> = {
    superadmin: { background: 'hsl(270 60% 25%)', color: 'hsl(270 80% 82%)' },
    admin: { background: 'hsl(0 60% 25%)', color: 'hsl(0 80% 82%)' },
    manager: { background: 'hsl(220 60% 25%)', color: 'hsl(220 80% 82%)' },
    athlete: { background: 'hsl(140 50% 20%)', color: 'hsl(140 65% 72%)' },
  };
  const s = styles[role] ?? { background: 'hsl(var(--card))', color: 'hsl(var(--muted))' };
  return (
    <span
      style={{
        ...s,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {role}
    </span>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(val?: number | null) {
  if (val == null) return '—';
  return `€${Number(val).toLocaleString('en-EU', { minimumFractionDigits: 2 })}`;
}

function formatNumber(val?: number | null) {
  if (val == null) return '—';
  return Number(val).toLocaleString();
}

const EMPTY_EDIT: EditFormState = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  payment_amount: '',
  contract_duration_months: '',
  instagram_followers: '',
  tiktok_followers: '',
  youtube_followers: '',
  accomplishments: [],
};

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      style={{
        width: 16,
        height: 16,
        transition: 'transform 0.2s',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Expandable row panel ─────────────────────────────────────────────────────

interface ExpandedPanelProps {
  p: Profile;
  allProfiles: Profile[];
  isSuperadmin: boolean;
  isAdmin: boolean;
  session: any;
  onEdit: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}

function ExpandedPanel({ p, allProfiles, isSuperadmin, isAdmin, session, onEdit, onDelete }: ExpandedPanelProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      setStatsLoading(true);
      try {
        const headers: Record<string, string> =
          session?.access_token
            ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
            : {};
        const res = await fetch(`/api/analytics/my-stats?athlete_id=${p.id}`, { headers, cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setStats({
            totalContent: json.total_content ?? json.totalContent ?? 0,
            totalOrders: json.total_orders ?? json.totalOrders ?? 0,
          });
        }
      } catch {
        // ignore
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [p.id, session]);

  const managerName =
    p.manager_id
      ? allProfiles.find((x) => x.id === p.manager_id)?.name ?? p.manager_id
      : null;

  const adminName =
    p.admin_id
      ? allProfiles.find((x) => x.id === p.admin_id)?.name ?? p.admin_id
      : null;

  const canSeeFinancials = isSuperadmin || isAdmin;

  const sectionTitle = (label: string) => (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'hsl(var(--muted))',
        marginBottom: 6,
        marginTop: 12,
      }}
    >
      {label}
    </p>
  );

  const field = (label: string, value: string | null | undefined) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'hsl(var(--foreground))' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: 20,
        marginTop: 2,
      }}
    >
      {/* Basic info */}
      {sectionTitle('Contact')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {field('Phone', p.phone)}
        {field('Address', p.address)}
        {field('City', p.city)}
        {field('State', p.state)}
        {field('Country', p.country)}
      </div>

      {/* Hierarchy */}
      {(managerName || adminName) && (
        <>
          {sectionTitle('Hierarchy')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {p.role === 'athlete' && field('Manager', managerName)}
            {p.role === 'manager' && field('Admin', adminName)}
          </div>
        </>
      )}

      {/* Financials — superadmin / admin only */}
      {canSeeFinancials && (
        <>
          {sectionTitle('Financials')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {field('Payment Amount', formatCurrency(p.payment_amount))}
            {field('Contract Duration', p.contract_duration_months != null ? `${p.contract_duration_months} months` : '—')}
          </div>
        </>
      )}

      {/* Social media — superadmin / admin only */}
      {canSeeFinancials && (
        <>
          {sectionTitle('Social Media')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {field('Instagram', formatNumber(p.instagram_followers))}
            {field('TikTok', formatNumber(p.tiktok_followers))}
            {field('YouTube', formatNumber(p.youtube_followers))}
          </div>
        </>
      )}

      {/* Accomplishments — superadmin / admin only */}
      {canSeeFinancials && (
        <>
          {sectionTitle('Accomplishments')}
          {(p.accomplishments ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>No accomplishments recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(p.accomplishments ?? []).map((acc, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--foreground))' }}>{acc.title}</span>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted))', whiteSpace: 'nowrap' }}>{acc.date}</span>
                  </div>
                  {acc.description && (
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 4 }}>{acc.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Stats */}
      {sectionTitle('Stats')}
      {statsLoading ? (
        <p style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>Loading stats…</p>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {field('Total Content', String(stats.totalContent))}
          {field('Total Orders', String(stats.totalOrders))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>Stats unavailable.</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid hsl(var(--border))' }}>
        <button
          className="btn"
          style={{ padding: '6px 16px', fontSize: 13, borderRadius: 6 }}
          onClick={() => onEdit(p)}
        >
          Edit
        </button>
        {canSeeFinancials && (
          <button
            style={{
              padding: '6px 16px',
              fontSize: 13,
              borderRadius: 6,
              background: 'hsl(0 60% 25%)',
              color: 'hsl(0 80% 82%)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onClick={() => onDelete(p)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  profile: Profile;
  isSuperadmin: boolean;
  isAdmin: boolean;
  session: any;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ profile: p, isSuperadmin, isAdmin, session, onClose, onSaved }: EditModalProps) {
  const canSeeFinancials = isSuperadmin || isAdmin;
  const [form, setForm] = useState<EditFormState>({
    name: p.name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    organization: p.organization ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    postal_code: p.postal_code ?? '',
    country: p.country ?? '',
    payment_amount: p.payment_amount != null ? String(p.payment_amount) : '',
    contract_duration_months: p.contract_duration_months != null ? String(p.contract_duration_months) : '',
    instagram_followers: p.instagram_followers != null ? String(p.instagram_followers) : '',
    tiktok_followers: p.tiktok_followers != null ? String(p.tiktok_followers) : '',
    youtube_followers: p.youtube_followers != null ? String(p.youtube_followers) : '',
    accomplishments: p.accomplishments ? [...p.accomplishments] : [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set(key: keyof EditFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addAccomplishment() {
    setForm((prev) => ({
      ...prev,
      accomplishments: [...prev.accomplishments, { title: '', date: '', description: '' }],
    }));
  }

  function updateAccomplishment(i: number, field: keyof Accomplishment, value: string) {
    setForm((prev) => {
      const updated = prev.accomplishments.map((a, idx) =>
        idx === i ? { ...a, [field]: value } : a,
      );
      return { ...prev, accomplishments: updated };
    });
  }

  function removeAccomplishment(i: number) {
    setForm((prev) => ({
      ...prev,
      accomplishments: prev.accomplishments.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers: Record<string, string> =
        session?.access_token
          ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };

      const body: Record<string, unknown> = {
        id: p.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        organization: form.organization,
        address: form.address,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        country: form.country,
      };
      if (canSeeFinancials) {
        body.payment_amount = form.payment_amount !== '' ? parseFloat(form.payment_amount) : null;
        body.contract_duration_months =
          form.contract_duration_months !== '' ? parseInt(form.contract_duration_months) : null;
        body.instagram_followers =
          form.instagram_followers !== '' ? parseInt(form.instagram_followers) : null;
        body.tiktok_followers =
          form.tiktok_followers !== '' ? parseInt(form.tiktok_followers) : null;
        body.youtube_followers =
          form.youtube_followers !== '' ? parseInt(form.youtube_followers) : null;
        body.accomplishments = form.accomplishments;
      }

      const res = await fetch('/api/profiles/update', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccess('Profile updated successfully.');
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error.');
    } finally {
      setLoading(false);
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

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'hsl(var(--muted))',
    marginBottom: 3,
    display: 'block',
  };

  const sectionTitle = (label: string) => (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'hsl(var(--muted))',
        marginBottom: 8,
        marginTop: 16,
        borderBottom: '1px solid hsl(var(--border))',
        paddingBottom: 4,
      }}
    >
      {label}
    </p>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>
            Edit {p.name ?? p.email}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'hsl(var(--muted))',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {sectionTitle('Basic Info')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Organization</label>
              <input style={inputStyle} value={form.organization} onChange={(e) => set('organization', e.target.value)} />
            </div>
          </div>

          {sectionTitle('Address')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Street Address</label>
              <input style={inputStyle} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>State / Region</label>
              <input style={inputStyle} value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Postal Code</label>
              <input style={inputStyle} value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          {canSeeFinancials && (
            <>
              {sectionTitle('Financials')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Payment Amount (€)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.01"
                    value={form.payment_amount}
                    onChange={(e) => set('payment_amount', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contract Duration (months)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={form.contract_duration_months}
                    onChange={(e) => set('contract_duration_months', e.target.value)}
                  />
                </div>
              </div>

              {sectionTitle('Social Media')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Instagram Followers</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={form.instagram_followers}
                    onChange={(e) => set('instagram_followers', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>TikTok Followers</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={form.tiktok_followers}
                    onChange={(e) => set('tiktok_followers', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>YouTube Followers</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={form.youtube_followers}
                    onChange={(e) => set('youtube_followers', e.target.value)}
                  />
                </div>
              </div>

              {sectionTitle('Accomplishments')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.accomplishments.map((acc, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
                      <div>
                        <label style={labelStyle}>Title</label>
                        <input
                          style={inputStyle}
                          value={acc.title}
                          onChange={(e) => updateAccomplishment(i, 'title', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAccomplishment(i)}
                        style={{
                          marginTop: 18,
                          background: 'none',
                          border: 'none',
                          color: 'hsl(0 60% 60%)',
                          cursor: 'pointer',
                          fontSize: 18,
                          padding: '4px 6px',
                          borderRadius: 4,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <label style={labelStyle}>Date</label>
                      <input
                        style={inputStyle}
                        type="date"
                        value={acc.date}
                        onChange={(e) => updateAccomplishment(i, 'date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Description</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                        value={acc.description}
                        onChange={(e) => updateAccomplishment(i, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAccomplishment}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: '1px dashed hsl(var(--border))',
                    background: 'none',
                    color: 'hsl(var(--muted))',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                  }}
                >
                  + Add Accomplishment
                </button>
              </div>
            </>
          )}

          {error && (
            <p style={{ color: 'hsl(0 70% 60%)', fontSize: 13, marginTop: 12 }}>{error}</p>
          )}
          {success && (
            <p style={{ color: 'hsl(140 60% 55%)', fontSize: 13, marginTop: 12 }}>{success}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                border: '1px solid hsl(var(--border))',
                background: 'none',
                color: 'hsl(var(--muted))',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ padding: '8px 22px', fontSize: 14, borderRadius: 6, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  target: Profile;
  session: any;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ target, session, onClose, onDeleted }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> =
        session?.access_token
          ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: target.email }),
      });
      if (res.ok) {
        onDeleted();
        onClose();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Failed to delete user.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: 28,
          width: '100%',
          maxWidth: 420,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 10 }}>
          Delete User
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted))', marginBottom: 20 }}>
          Are you sure you want to permanently delete{' '}
          <strong style={{ color: 'hsl(var(--foreground))' }}>{target.name ?? target.email}</strong>?
          This action cannot be undone.
        </p>
        {error && <p style={{ color: 'hsl(0 70% 60%)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'none',
              color: 'hsl(var(--muted))',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: 'hsl(0 60% 40%)',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Directory ─────────────────────────────────────────────────────────

interface DirectoryTabProps {
  myProfile: Profile;
  session: any;
}

function DirectoryTab({ myProfile, session }: DirectoryTabProps) {
  const isSuperadmin = myProfile.role === 'superadmin';
  const isAdmin = myProfile.role === 'admin';

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // All profiles for name resolution (manager/admin names)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const fetchHeaders = useCallback((): Record<string, string> =>
    session?.access_token
      ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : {},
  [session]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await fetch(`/api/profiles/list?${params}`, {
        headers: fetchHeaders(),
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) {
        setProfiles(json.profiles ?? []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotalCount(json.pagination?.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, fetchHeaders]);

  // Fetch all profiles once for name resolution
  const fetchAllProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles/list?limit=1000', {
        headers: fetchHeaders(),
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) setAllProfiles(json.profiles ?? []);
    } catch {
      // ignore
    }
  }, [fetchHeaders]);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
    }, 350);
  }

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    fetchAllProfiles();
  }, [fetchAllProfiles]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
          <svg
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: 'hsl(var(--muted))',
              pointerEvents: 'none',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ minWidth: 140 }}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Roles</option>
          <option value="athlete">Athletes</option>
          <option value="manager">Managers</option>
          <option value="admin">Admins</option>
          {isSuperadmin && <option value="superadmin">Superadmins</option>}
        </select>

        {(search || roleFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setPage(1); }}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'none',
              color: 'hsl(var(--muted))',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Clear
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'hsl(var(--muted))' }}>
          {totalCount} user{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="card"
        style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid hsl(var(--border))' }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted))' }}>
            Loading…
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted))' }}>
            No users found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Name', 'Email', 'Role', 'Organization', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'hsl(var(--muted))',
                        whiteSpace: 'nowrap',
                        background: 'hsl(var(--card))',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <Fragment key={p.id}>
                    <tr
                      style={{
                        borderBottom:
                          expandedId === p.id
                            ? 'none'
                            : '1px solid hsl(var(--border))',
                        background:
                          expandedId === p.id
                            ? 'hsl(var(--background))'
                            : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>
                        {p.name ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'hsl(var(--muted))' }}>
                        {p.email}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {roleBadgeInline(p.role)}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'hsl(var(--muted))' }}>
                        {p.organization ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'hsl(var(--muted))', whiteSpace: 'nowrap' }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => toggleExpand(p.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid hsl(var(--border))',
                            background: expandedId === p.id ? 'hsl(var(--border))' : 'none',
                            color: 'hsl(var(--foreground))',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Details
                          <ChevronDown open={expandedId === p.id} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-expanded`} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td colSpan={6} style={{ padding: '0 14px 12px' }}>
                          <ExpandedPanel
                            p={p}
                            allProfiles={allProfiles}
                            isSuperadmin={isSuperadmin}
                            isAdmin={isAdmin}
                            session={session}
                            onEdit={(target) => setEditTarget(target)}
                            onDelete={(target) => setDeleteTarget(target)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'none',
              color: page === 1 ? 'hsl(var(--muted))' : 'hsl(var(--foreground))',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'none',
              color: page === totalPages ? 'hsl(var(--muted))' : 'hsl(var(--foreground))',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {editTarget && (
        <EditModal
          profile={editTarget}
          isSuperadmin={isSuperadmin}
          isAdmin={isAdmin}
          session={session}
          onClose={() => setEditTarget(null)}
          onSaved={fetchProfiles}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          session={session}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchProfiles}
        />
      )}
    </div>
  );
}

// ─── Tab 2: Assignments ───────────────────────────────────────────────────────

interface AssignmentsTabProps {
  myProfile: Profile;
  session: any;
}

function AssignmentsTab({ myProfile, session }: AssignmentsTabProps) {
  const isSuperadmin = myProfile.role === 'superadmin';

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-row state maps
  const [managerRows, setManagerRows] = useState<Record<string, AssignmentRow>>({});
  const [athleteRows, setAthleteRows] = useState<Record<string, AssignmentRow>>({});

  const fetchHeaders = useCallback((): Record<string, string> =>
    session?.access_token
      ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : {},
  [session]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/profiles/list?limit=1000', {
          headers: fetchHeaders(),
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.success) {
          const list: Profile[] = json.profiles ?? [];
          setAllProfiles(list);

          // Initialise row state
          const mRows: Record<string, AssignmentRow> = {};
          const aRows: Record<string, AssignmentRow> = {};
          for (const p of list) {
            if (p.role === 'manager') {
              mRows[p.id] = {
                profileId: p.id,
                assignToId: p.admin_id ?? '',
                saving: false,
                error: null,
                success: null,
              };
            }
            if (p.role === 'athlete') {
              aRows[p.id] = {
                profileId: p.id,
                assignToId: p.manager_id ?? '',
                saving: false,
                error: null,
                success: null,
              };
            }
          }
          setManagerRows(mRows);
          setAthleteRows(aRows);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchHeaders]);

  async function saveAssignment(
    profileId: string,
    assignmentType: 'manager_to_admin' | 'athlete_to_manager',
    assignToId: string,
    rowSetter: React.Dispatch<React.SetStateAction<Record<string, AssignmentRow>>>,
  ) {
    rowSetter((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], saving: true, error: null, success: null },
    }));
    try {
      const res = await fetch('/api/profiles/assign', {
        method: 'POST',
        headers: fetchHeaders(),
        body: JSON.stringify({
          targetId: profileId,
          assignmentType,
          assignToId: assignToId || null,
        }),
      });
      if (res.ok) {
        rowSetter((prev) => ({
          ...prev,
          [profileId]: { ...prev[profileId], saving: false, success: 'Saved.' },
        }));
        setTimeout(() => {
          rowSetter((prev) => ({
            ...prev,
            [profileId]: { ...prev[profileId], success: null },
          }));
        }, 2000);
      } else {
        const json = await res.json().catch(() => ({}));
        rowSetter((prev) => ({
          ...prev,
          [profileId]: { ...prev[profileId], saving: false, error: json.error ?? 'Failed to save.' },
        }));
      }
    } catch (err: any) {
      rowSetter((prev) => ({
        ...prev,
        [profileId]: { ...prev[profileId], saving: false, error: err?.message ?? 'Unexpected error.' },
      }));
    }
  }

  const managers = allProfiles.filter((p) => p.role === 'manager');
  const athletes = allProfiles.filter((p) => p.role === 'athlete');
  const admins = allProfiles.filter((p) => p.role === 'admin' || p.role === 'superadmin');

  const sectionTitle = (label: string, sub?: string) => (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>{label}</h3>
      {sub && <p style={{ fontSize: 13, color: 'hsl(var(--muted))', marginTop: 2 }}>{sub}</p>}
    </div>
  );

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid hsl(var(--border))',
    flexWrap: 'wrap',
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    fontSize: 13,
    minWidth: 200,
    flex: '1 1 200px',
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--muted))' }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Managers → Admin (superadmin only) */}
      {isSuperadmin && (
        <div className="card" style={{ padding: 24, borderRadius: 10, border: '1px solid hsl(var(--border))' }}>
          {sectionTitle('Manager → Admin', 'Assign each manager to an admin account.')}
          {managers.length === 0 ? (
            <p style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>No managers found.</p>
          ) : (
            managers.map((mgr) => {
              const row = managerRows[mgr.id];
              if (!row) return null;
              return (
                <div key={mgr.id} style={rowStyle}>
                  <div style={{ minWidth: 180, flex: '1 1 180px' }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: 'hsl(var(--foreground))' }}>
                      {mgr.name ?? mgr.email}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'hsl(var(--muted))' }}>{mgr.email}</p>
                  </div>
                  <select
                    style={selectStyle}
                    value={row.assignToId}
                    onChange={(e) =>
                      setManagerRows((prev) => ({
                        ...prev,
                        [mgr.id]: { ...prev[mgr.id], assignToId: e.target.value },
                      }))
                    }
                  >
                    <option value="">— Unassigned —</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name ?? a.email}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn"
                    disabled={row.saving}
                    style={{ padding: '6px 16px', fontSize: 13, borderRadius: 6, opacity: row.saving ? 0.7 : 1, whiteSpace: 'nowrap' }}
                    onClick={() => saveAssignment(mgr.id, 'manager_to_admin', row.assignToId, setManagerRows)}
                  >
                    {row.saving ? 'Saving…' : 'Save'}
                  </button>
                  {row.success && (
                    <span style={{ fontSize: 12, color: 'hsl(140 60% 55%)' }}>{row.success}</span>
                  )}
                  {row.error && (
                    <span style={{ fontSize: 12, color: 'hsl(0 70% 60%)' }}>{row.error}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Athletes → Managers */}
      <div className="card" style={{ padding: 24, borderRadius: 10, border: '1px solid hsl(var(--border))' }}>
        {sectionTitle('Athlete → Manager', 'Assign each athlete to a manager.')}
        {athletes.length === 0 ? (
          <p style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>No athletes found.</p>
        ) : (
          athletes.map((ath) => {
            const row = athleteRows[ath.id];
            if (!row) return null;
            return (
              <div key={ath.id} style={rowStyle}>
                <div style={{ minWidth: 180, flex: '1 1 180px' }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: 'hsl(var(--foreground))' }}>
                    {ath.name ?? ath.email}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'hsl(var(--muted))' }}>{ath.email}</p>
                </div>
                <select
                  style={selectStyle}
                  value={row.assignToId}
                  onChange={(e) =>
                    setAthleteRows((prev) => ({
                      ...prev,
                      [ath.id]: { ...prev[ath.id], assignToId: e.target.value },
                    }))
                  }
                >
                  <option value="">— Unassigned —</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </option>
                  ))}
                </select>
                <button
                  className="btn"
                  disabled={row.saving}
                  style={{ padding: '6px 16px', fontSize: 13, borderRadius: 6, opacity: row.saving ? 0.7 : 1, whiteSpace: 'nowrap' }}
                  onClick={() => saveAssignment(ath.id, 'athlete_to_manager', row.assignToId, setAthleteRows)}
                >
                  {row.saving ? 'Saving…' : 'Save'}
                </button>
                {row.success && (
                  <span style={{ fontSize: 12, color: 'hsl(140 60% 55%)' }}>{row.success}</span>
                )}
                {row.error && (
                  <span style={{ fontSize: 12, color: 'hsl(0 70% 60%)' }}>{row.error}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Invitations ───────────────────────────────────────────────────────

interface InvitationsTabProps {
  createInvitation: (email: string, role: 'admin' | 'manager' | 'athlete', message?: string) => Promise<any>;
  getInvitations: () => Promise<Invitation[]>;
  deleteInvitation: (id: string) => Promise<void>;
}

function InvitationsTab({ createInvitation, getInvitations, deleteInvitation }: InvitationsTabProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'athlete' | 'manager' | 'admin'>('athlete');
  const [message, setMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await getInvitations();
      setInvitations(list ?? []);
    } catch (err: any) {
      setListError(err?.message ?? 'Failed to load invitations.');
    } finally {
      setListLoading(false);
    }
  }, [getInvitations]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSendLoading(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      await createInvitation(email.trim(), role, message.trim() || undefined);
      setSendSuccess(`Invitation sent to ${email.trim()}.`);
      setEmail('');
      setMessage('');
      loadInvitations();
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to send invitation.');
    } finally {
      setSendLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  const statusColors: Record<string, React.CSSProperties> = {
    pending: { background: 'hsl(45 70% 20%)', color: 'hsl(45 80% 72%)' },
    accepted: { background: 'hsl(140 50% 18%)', color: 'hsl(140 65% 70%)' },
    expired: { background: 'hsl(0 40% 20%)', color: 'hsl(0 60% 65%)' },
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Send invitation form */}
      <div className="card" style={{ padding: 24, borderRadius: 10, border: '1px solid hsl(var(--border))' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 16 }}>
          Send Invitation
        </h3>
        <form onSubmit={handleSend}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))', display: 'block', marginBottom: 4 }}>
                Email
              </label>
              <input
                style={inputStyle}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))', display: 'block', marginBottom: 4 }}>
                Role
              </label>
              <select
                style={inputStyle}
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="athlete">Athlete</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))', display: 'block', marginBottom: 4 }}>
                Message (optional)
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Personal message to include in the invitation email…"
              />
            </div>
          </div>

          {sendError && <p style={{ color: 'hsl(0 70% 60%)', fontSize: 13, marginTop: 10 }}>{sendError}</p>}
          {sendSuccess && <p style={{ color: 'hsl(140 60% 55%)', fontSize: 13, marginTop: 10 }}>{sendSuccess}</p>}

          <div style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="btn"
              disabled={sendLoading}
              style={{ padding: '8px 24px', fontSize: 14, borderRadius: 6, opacity: sendLoading ? 0.7 : 1 }}
            >
              {sendLoading ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing invitations */}
      <div className="card" style={{ padding: 24, borderRadius: 10, border: '1px solid hsl(var(--border))' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 16 }}>
          Existing Invitations
        </h3>

        {listLoading ? (
          <p style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>Loading…</p>
        ) : listError ? (
          <p style={{ color: 'hsl(0 70% 60%)', fontSize: 13 }}>{listError}</p>
        ) : invitations.length === 0 ? (
          <p style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>No invitations yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Email', 'Role', 'Status', 'Sent', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'hsl(var(--muted))',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'hsl(var(--foreground))' }}>
                      {inv.email}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {roleBadgeInline(inv.role)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          ...(statusColors[inv.status] ?? {}),
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'hsl(var(--muted))', whiteSpace: 'nowrap' }}>
                      {formatDate(inv.created_at)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deletingId === inv.id}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 5,
                          border: 'none',
                          background: 'hsl(0 50% 28%)',
                          color: 'hsl(0 80% 82%)',
                          cursor: deletingId === inv.id ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 500,
                          opacity: deletingId === inv.id ? 0.6 : 1,
                        }}
                      >
                        {deletingId === inv.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

type Tab = 'directory' | 'assignments' | 'invitations';

export default function UserDirectoryPage() {
  const { profile, session, createInvitation, getInvitations, deleteInvitation } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('directory');

  const isSuperadmin = profile?.role === 'superadmin';
  const isAdmin = profile?.role === 'admin';
  const canSeeAssignments = isSuperadmin || isAdmin;

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'directory', label: 'Directory', visible: true },
    { id: 'assignments', label: 'Assignments', visible: canSeeAssignments },
    { id: 'invitations', label: 'Invitations', visible: canSeeAssignments },
  ];

  return (
    <ProtectedRoute requiredRole={['admin', 'superadmin']}>
      <div style={{ padding: '24px 24px 48px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'hsl(var(--foreground))',
              margin: '0 0 4px',
            }}
          >
            User Directory
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted))', margin: 0 }}>
            Manage all users, assignments, and invitations.
          </p>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid hsl(var(--border))',
            marginBottom: 28,
          }}
        >
          {tabs.filter((t) => t.visible).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                color: activeTab === tab.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {profile && (
          <>
            {activeTab === 'directory' && (
              <DirectoryTab myProfile={profile} session={session} />
            )}
            {activeTab === 'assignments' && canSeeAssignments && (
              <AssignmentsTab myProfile={profile} session={session} />
            )}
            {activeTab === 'invitations' && canSeeAssignments && (
              <InvitationsTab
                createInvitation={createInvitation}
                getInvitations={getInvitations}
                deleteInvitation={deleteInvitation}
              />
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
