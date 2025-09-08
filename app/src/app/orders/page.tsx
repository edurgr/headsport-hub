'use client';

import { useEffect, useState } from 'react';

import AddressManager, { Address } from '@/components/AddressManager';
import ProductSearch from '@/components/ProductSearch';
import ProtectedRoute from '@/components/ProtectedRoute';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useDownload } from '@/contexts/DownloadContext';
import { OrderRow } from '@/types';

export default function OrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'mine' | 'all'>('all');
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<Address | null>(null);
  const { user, profile } = useAuth();
  const download = useDownload();

  useEffect(() => {
    if (user?.email || profile?.role) fetchOrders();
  }, [user?.email, profile?.role, filter]);

  async function fetchOrders() {
    try {
      let url = '/api/orders';
      if (profile?.role === 'manager' || profile?.role === 'admin') {
        if (filter === 'pending') url += '?scope=pending';
        else if (filter === 'approved') url += '?scope=approved';
        else if (filter === 'mine' && user?.email)
          url += `?scope=mine&athleteEmail=${encodeURIComponent(user.email)}`;
        else if (filter === 'all') url += '?scope=all';
      } else if (user?.email) {
        // Athlete: fetch complete history with a high limit to show all career orders
        url += `?scope=mine&athleteEmail=${encodeURIComponent(user.email)}&limit=1000`;
      }
      const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      const json = await res.json();
      if (res.ok) {
        setOrders(
          (json.orders || []).map((o: any) => ({
            id: o.id,
            status: o.status,
            athlete: o.athlete_name || o.athlete_email,
            athletePhone: o.athlete_phone || '',
            athleteEmail: o.athlete_email || '',
            items: (o.order_items || []).length,
            orderDate: new Date(o.created_at).toLocaleDateString(),
            itemsList: (o.order_items || [])
              .slice(0, 3)
              .map((it: any) => `${it.quantity}x ${it.product_name}`),
            urgent: false,
            rawItems: o.order_items || [],
            shippingAddress: o.shipping_address || {},
            approvedBy: o.approved_by_email || '',
            approvedAt: o.approved_at || '',
          })),
        );
      } else {
        setOrders([]);
      }
    } catch (e) {
      setOrders([]);
    }
  }

  function addRow() {
    setRows((r) => [
      ...r,
      { product: null, length_cm: '', quantity: 1, boot_size: '', binding_color: '' },
    ]);
  }

  function setRow(i: number, patch: Partial<OrderRow>) {
    setRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!selectedShippingAddress) {
      alert('Please select a shipping address');
      return;
    }

    if (rows.length === 0) {
      alert('Please add at least one item to your order');
      return;
    }

    // Validate that all required fields are filled
    const validationErrors: string[] = [];
    rows.forEach((row, index) => {
      if (!row.product) {
        validationErrors.push(`Item ${index + 1}: Product is required`);
      }
      if (row.quantity < 1) {
        validationErrors.push(`Item ${index + 1}: Quantity must be at least 1`);
      }
      if (row.product?.category === 'skis' && (!row.length_cm || row.length_cm === '')) {
        validationErrors.push(`Item ${index + 1}: Length is required for skis`);
      }
      if (row.product?.category === 'boots' && (!row.boot_size || row.boot_size === '')) {
        validationErrors.push(`Item ${index + 1}: Boot size is required for boots`);
      }
    });

    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      const requestData = {
        rows: rows,
        athleteEmail: user?.email,
        shippingAddress: selectedShippingAddress,
      };

      console.log('📤 Sending order request:', JSON.stringify(requestData, null, 2));

      const res = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const json = await res.json();
      console.log('📥 Order response:', res.status, JSON.stringify(json, null, 2));

      if (json.success) {
        alert('Order submitted successfully! It has been sent for manager approval.');
        setRows([]);
        setShowCreateModal(false);
        setSelectedShippingAddress(null);
        // Refresh orders list
        fetchOrders();
      } else {
        alert('Failed to submit order: ' + (json.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'badge-warning';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-error';
      default:
        return '';
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))] mb-1 sm:mb-2">
            Orders
          </h1>
          <p className="text-[hsl(var(--muted))] text-sm sm:text-base">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Order History Section */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
            Order History
          </h2>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[hsl(var(--muted))]">All your past orders</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn px-5 py-2 rounded-lg font-medium"
            >
              + New Order
            </button>
          </div>

          {/* Summary Cards (simplified) */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                {orders.filter((o) => o.status === 'pending_approval').length}
              </div>
              <div className="text-sm" style={{ color: 'hsl(var(--warning))' }}>
                Pending Approval
              </div>
              <div className="text-xs" style={{ color: 'hsl(var(--warning))' }}>
                Awaiting manager approval
              </div>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                {orders.filter((o) => o.status === 'approved').length}
              </div>
              <div className="text-sm" style={{ color: 'hsl(var(--success))' }}>
                Approved
              </div>
              <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
                Manager approved orders
              </div>
            </div>
          </div>

          {/* Filters removed for athletes (history view). Manager/admin have dedicated scope filter below */}

          {/* Manager/Admin Controls: Filters */}
          {profile?.role === 'manager' || profile?.role === 'admin' ? (
            <div
              className="mb-6 p-3 sm:p-4 rounded-lg"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  Manager view:
                </span>
                <div className="flex gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="mine">My Orders</option>
                  </select>
                  <button onClick={fetchOrders} className="btn px-3 py-2 text-sm">
                    Refresh
                  </button>
                </div>
                <button
                  onClick={() => {
                    download.begin('Preparing CSV…');
                    const headers = [
                      'Order ID',
                      'Athlete',
                      'Status',
                      'Created At',
                      'Item',
                      'SKU',
                      'Qty',
                      'Length',
                      'Boot Size',
                      'Color',
                    ];
                    const rowsCsv: string[] = [headers.join(',')];
                    orders.forEach((o: any) => {
                      (o.rawItems || []).forEach((it: any) => {
                        rowsCsv.push(
                          [
                            o.id,
                            o.athlete,
                            o.status,
                            o.orderDate,
                            it.product_name,
                            it.product_sku,
                            it.quantity,
                            it.length_cm || '',
                            it.boot_size || '',
                            it.binding_color || '',
                          ]
                            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                            .join(','),
                        );
                      });
                    });
                    const blob = new Blob([rowsCsv.join('\n')], {
                      type: 'text/csv;charset=utf-8;',
                    });
                    const urlCsv = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = urlCsv;
                    a.download = `orders-${filter}.csv`;
                    a.click();
                    URL.revokeObjectURL(urlCsv);
                    download.end();
                  }}
                  className="sm:ml-auto btn-approve px-3 py-2 text-sm rounded"
                >
                  Export CSV
                </button>
              </div>
            </div>
          ) : null}

          {/* Order Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:p-6 rounded-lg border overflow-hidden"
                style={{
                  backgroundColor: 'hsl(var(--secondary))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--border))' }}
                    >
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {order.athlete
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[hsl(var(--foreground))] text-sm sm:text-base break-words">
                        {order.athlete}
                      </h3>
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                        Items: {order.items}
                      </p>
                      {order.approvedBy && (
                        <p className="text-xs text-[hsl(var(--muted))] break-words line-clamp-2">
                          Approved by: {order.approvedBy}{' '}
                          {order.approvedAt
                            ? `on ${new Date(order.approvedAt).toLocaleDateString()}`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap max-w-full w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ${getStatusColor(order.status)}`}
                      style={{ lineHeight: 1 }}
                    >
                      {order.status}
                    </span>
                    {(profile?.role === 'manager' || profile?.role === 'admin') &&
                      order.status === 'pending_approval' && (
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/orders/approve', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                orderId: order.id,
                                action: 'approve',
                                approverEmail: user?.email,
                              }),
                            });
                            const json = await res.json();
                            if (res.ok) {
                              alert('Order approved');
                              fetchOrders();
                            } else {
                              alert('Failed to approve: ' + (json.error || 'Unknown error'));
                            }
                          }}
                          className="btn-approve px-2 py-1 text-xs rounded"
                        >
                          Approve
                        </button>
                      )}
                    {(profile?.role === 'manager' || profile?.role === 'admin') &&
                      order.status === 'pending_approval' && (
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/orders/approve', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                orderId: order.id,
                                action: 'reject',
                                approverEmail: user?.email,
                              }),
                            });
                            const json = await res.json();
                            if (res.ok) {
                              alert('Order rejected');
                              fetchOrders();
                            } else {
                              alert('Failed to reject: ' + (json.error || 'Unknown error'));
                            }
                          }}
                          className="btn-reject px-2 py-1 text-xs rounded"
                        >
                          Reject
                        </button>
                      )}
                  </div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mb-2">
                    Order Date: {order.orderDate}
                  </p>
                  <div className="space-y-1">
                    {(order.itemsList || []).map((item: string, index: number) => (
                      <p key={index} className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                <details
                  className="w-full px-3 sm:px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <summary className="cursor-pointer">View Details</summary>
                  <div className="mt-3 space-y-2">
                    {/* Athlete summary */}
                    <div
                      className="p-2 rounded border text-xs"
                      style={{
                        backgroundColor: 'hsl(var(--secondary))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    >
                      <span className="font-medium">Athlete:</span> {order.athlete}
                      {order.athletePhone || order.shippingAddress?.phone ? (
                        <span> — Phone: {order.athletePhone || order.shippingAddress?.phone}</span>
                      ) : null}
                    </div>
                    {/* Shipping Address Summary */}
                    {order.shippingAddress && (
                      <div
                        className="p-2 rounded border text-xs"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      >
                        <div className="font-medium mb-1">Shipping Address</div>
                        <div>{order.shippingAddress.name || ''}</div>
                        <div>{order.shippingAddress.addressLine1 || ''}</div>
                        {order.shippingAddress.addressLine2 ? (
                          <div>{order.shippingAddress.addressLine2}</div>
                        ) : null}
                        <div>
                          {order.shippingAddress.city || ''}
                          {order.shippingAddress.state
                            ? `, ${order.shippingAddress.state}`
                            : ''}{' '}
                          {order.shippingAddress.postalCode || ''}
                        </div>
                        <div>{order.shippingAddress.country || ''}</div>
                        {order.shippingAddress.phone ? (
                          <div>Phone: {order.shippingAddress.phone}</div>
                        ) : null}
                      </div>
                    )}
                    {(order as any).rawItems?.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-2 rounded border"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          borderColor: 'hsl(var(--border))',
                        }}
                      >
                        <div className="font-medium">{it.product_name}</div>
                        <div className="text-xs text-[hsl(var(--muted))]">
                          SKU: {it.product_sku} | Qty: {it.quantity}
                          {it.length_cm ? ` | Length: ${it.length_cm}cm` : ''}
                          {it.boot_size ? ` | Boot Size: ${it.boot_size}` : ''}
                          {it.binding_color ? ` | Color: ${it.binding_color}` : ''}
                        </div>
                      </div>
                    ))}
                    {(profile?.role === 'manager' || profile?.role === 'admin') && (
                      <button
                        onClick={() => {
                          download.begin('Preparing order CSV…');
                          const headers = [
                            'Order ID',
                            'Athlete',
                            'Athlete Email',
                            'Athlete Phone',
                            'Status',
                            'Created At',
                            'Approved By',
                            'Approved At',
                            'Ship Name',
                            'Ship Address 1',
                            'Ship Address 2',
                            'Ship City',
                            'Ship State',
                            'Ship Postal',
                            'Ship Country',
                            'Ship Phone',
                          ];
                          const lineHeaders = [
                            'Item',
                            'SKU',
                            'Qty',
                            'Length',
                            'Boot Size',
                            'Color',
                          ];
                          const rows: string[] = [];
                          // Header block
                          rows.push(headers.join(','));
                          rows.push(
                            [
                              order.id,
                              order.athlete,
                              order.athleteEmail || '',
                              order.athletePhone || order.shippingAddress?.phone || '',
                              order.status,
                              order.orderDate,
                              order.approvedBy || '',
                              order.approvedAt ? new Date(order.approvedAt).toLocaleString() : '',
                              order.shippingAddress?.name || '',
                              order.shippingAddress?.addressLine1 || '',
                              order.shippingAddress?.addressLine2 || '',
                              order.shippingAddress?.city || '',
                              order.shippingAddress?.state || '',
                              order.shippingAddress?.postalCode || '',
                              order.shippingAddress?.country || '',
                              order.shippingAddress?.phone || '',
                            ]
                              .map((v: any) => `"${String(v).replace(/"/g, '""')}"`)
                              .join(','),
                          );
                          // Blank line
                          rows.push('');
                          // Items table
                          rows.push(lineHeaders.join(','));
                          (order as any).rawItems.forEach((it: any) => {
                            rows.push(
                              [
                                it.product_name,
                                it.product_sku,
                                it.quantity,
                                it.length_cm || '',
                                it.boot_size || '',
                                it.binding_color || '',
                              ]
                                .map((v: any) => `"${String(v).replace(/"/g, '""')}"`)
                                .join(','),
                            );
                          });
                          const blob = new Blob([rows.join('\n')], {
                            type: 'text/csv;charset=utf-8;',
                          });
                          const urlCsv = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = urlCsv;
                          a.download = `order-${order.id}.csv`;
                          a.click();
                          URL.revokeObjectURL(urlCsv);
                          download.end();
                        }}
                        className="mt-3 px-3 py-1 text-xs btn"
                      >
                        Export Order CSV
                      </button>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>

        {/* Create Order Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-5xl mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
                      Create New Order
                    </h2>
                    <p className="text-[hsl(var(--muted))] text-sm sm:text-base">
                      Fill in the details to create a new merchandise/equipment order.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
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
              </div>

              <div className="p-4 sm:p-6">
                {/* Order Details Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                    Order Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        Order ID
                      </label>
                      <input
                        type="text"
                        value="ORD-653027"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-[hsl(var(--muted))]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        Athlete
                      </label>
                      <input
                        type="text"
                        value={user?.email || 'demo@antolau.com'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-[hsl(var(--muted))]"
                      />
                      <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                        This order is for the logged-in user
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                    Items
                  </h3>
                  {rows.length === 0 ? (
                    <div className="text-center py-8 text-[hsl(var(--muted))]">
                      No items in order. Click "+ Add Item" to get started.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {rows.map((row, i) => (
                        <div
                          key={i}
                          className="p-4 sm:p-6 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between items-center mb-3 sm:mb-4">
                            <h4 className="font-medium text-[hsl(var(--foreground))]">
                              Item {i + 1}
                            </h4>
                            <button
                              onClick={() => removeRow(i)}
                              className="text-red-600 hover:text-red-800 text-sm flex items-center"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Remove
                            </button>
                          </div>

                          <div className="space-y-4">
                            {/* Product Selection */}
                            <div>
                              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                Product
                              </label>
                              <ProductSearch
                                onSelect={(p: any) => setRow(i, { product: p })}
                                selectedProduct={row.product}
                              />
                            </div>

                            {/* Product Specifications */}
                            {row.product && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={row.quantity}
                                    onChange={(e) =>
                                      setRow(i, { quantity: Number(e.target.value) })
                                    }
                                    className="w-full px-3 h-11 sm:h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                                  />
                                </div>

                                {row.product?.category === 'skis' && (
                                  <div>
                                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                      Length (cm)
                                    </label>
                                    {Array.isArray((row.product as any).available_lengths) &&
                                    (row.product as any).available_lengths.length > 0 ? (
                                      <ResponsiveSelect
                                        ariaLabel="Length (cm)"
                                        value={row.length_cm || ''}
                                        onChange={(v) => setRow(i, { length_cm: v })}
                                        options={[
                                          { value: '', label: 'Select length' },
                                          ...((row.product as any).available_lengths || []).map(
                                            (len: number) => ({
                                              value: String(len),
                                              label: String(len),
                                            }),
                                          ),
                                        ]}
                                        className="w-full px-3 h-11 sm:h-9 bg-white border border-gray-300 rounded-lg"
                                      />
                                    ) : (
                                      <input
                                        type="number"
                                        value={row.length_cm}
                                        onChange={(e) => setRow(i, { length_cm: e.target.value })}
                                        placeholder="Enter length"
                                        className="w-full px-3 h-11 sm:h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                                      />
                                    )}
                                  </div>
                                )}

                                {row.product?.category === 'boots' && (
                                  <div>
                                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                      Boot Size
                                    </label>
                                    <input
                                      type="text"
                                      value={row.boot_size}
                                      onChange={(e) => setRow(i, { boot_size: e.target.value })}
                                      placeholder="Enter boot size"
                                      className="w-full px-3 h-11 sm:h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                                    />
                                  </div>
                                )}

                                {row.product?.category === 'bindings' && (
                                  <div>
                                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                      Color
                                    </label>
                                    <input
                                      type="text"
                                      value={row.binding_color || ''}
                                      onChange={(e) => setRow(i, { binding_color: e.target.value })}
                                      placeholder="Enter color"
                                      className="w-full px-3 h-11 sm:h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                                    />
                                  </div>
                                )}

                                {/* Optional: other categories */}
                                {row.product?.category &&
                                  !['skis', 'boots', 'bindings'].includes(row.product.category) && (
                                    <div>
                                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                                        Size
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Enter size"
                                        className="w-full px-3 h-11 sm:h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                                      />
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={addRow}
                    className="mt-3 sm:mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
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
                    + Add Item
                  </button>
                </div>

                {/* Customization Section */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Customization / Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any special instructions or notes..."
                  />
                </div>

                {/* Saved Addresses Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                    Shipping Address
                  </h3>
                  <AddressManager
                    onSelectAddress={(address) => {
                      setSelectedShippingAddress(address);
                    }}
                    selectMode={true}
                    useDatabase={true}
                  />

                  {/* Selected Address Display */}
                  {selectedShippingAddress && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-[hsl(var(--foreground))] mb-2">
                        Selected Shipping Address:
                      </h4>
                      <div className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                        <p>
                          <strong>{selectedShippingAddress.name}</strong>
                        </p>
                        <p>{selectedShippingAddress.addressLine1}</p>
                        {selectedShippingAddress.addressLine2 && (
                          <p>{selectedShippingAddress.addressLine2}</p>
                        )}
                        <p>
                          {selectedShippingAddress.city}, {selectedShippingAddress.state}{' '}
                          {selectedShippingAddress.postalCode}
                        </p>
                        <p>{selectedShippingAddress.country}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2 border border-gray-300 text-[hsl(var(--muted))] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    className="px-5 py-2 bg-[hsl(var(--foreground))] text-white rounded-lg hover:bg-[hsl(var(--foreground))] transition-colors font-medium"
                  >
                    Create Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
