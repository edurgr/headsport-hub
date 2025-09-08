'use client';

import { useEffect, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  id: string;
  product_name: string;
  product_sku: string;
  product_category: string;
  quantity: number;
  length_cm?: number;
  boot_size?: string;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  athlete_name: string;
  athlete_email: string;
  status: string;
  created_at: string;
  shipping_address: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  order_items: OrderItem[];
}

export default function PendingOrdersPage() {
  const { user, profile } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [managerNotes, setManagerNotes] = useState('');
  const [sendToSAP, setSendToSAP] = useState(false);
  const [pricing, setPricing] = useState<Record<string, { unitPrice: number; totalPrice: number }>>(
    {},
  );

  useEffect(() => {
    if (profile?.role === 'manager' || profile?.role === 'admin') {
      fetchPendingOrders();
    }
  }, [profile]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/orders/pending');
      const result = await response.json();

      if (response.ok) {
        setPendingOrders(result.orders || []);
      } else {
        console.error('Failed to fetch pending orders:', result.error);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: approvalAction,
          managerNotes,
          sendToSAP,
          pricing: Object.keys(pricing).length > 0 ? pricing : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Order ${approvalAction}ed successfully!`);
        setShowApprovalModal(false);
        setSelectedOrder(null);
        setManagerNotes('');
        setPricing({});
        fetchPendingOrders(); // Refresh the list
      } else {
        alert('Failed to process order: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error processing order approval:', error);
      alert('Failed to process order approval. Please try again.');
    }
  };

  const openApprovalModal = (order: Order, action: 'approve' | 'reject') => {
    setSelectedOrder(order);
    setApprovalAction(action);
    setShowApprovalModal(true);
    setManagerNotes('');
    setPricing({});
  };

  const updatePricing = (itemId: string, field: 'unitPrice' | 'totalPrice', value: number) => {
    setPricing((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  if (!user || (profile?.role !== 'manager' && profile?.role !== 'admin')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h1>
          <p className="text-red-700">Only managers and administrators can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Orders</h1>
          <p className="text-gray-600">
            Review and approve athlete merchandise orders before sending to SAP
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {pendingOrders.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Orders</h3>
              <p className="text-gray-600">All orders have been processed.</p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      HEAD Hub Athlete: {order.athlete_name} ({order.athlete_email})
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openApprovalModal(order, 'approve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openApprovalModal(order, 'reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Shipping Address:</h4>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>{order.shipping_address.name}</strong>
                    </p>
                    <p>{order.shipping_address.addressLine1}</p>
                    {order.shipping_address.addressLine2 && (
                      <p>{order.shipping_address.addressLine2}</p>
                    )}
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state}{' '}
                      {order.shipping_address.postalCode}
                    </p>
                    <p>{order.shipping_address.country}</p>
                    {order.shipping_address.phone && <p>Phone: {order.shipping_address.phone}</p>}
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Order Items:</h4>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            SKU: {item.product_sku} | Category: {item.product_category}
                          </p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity}
                            {item.length_cm && ` | Length: ${item.length_cm}cm`}
                            {item.boot_size && ` | Boot Size: ${item.boot_size}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Unit Price: €{item.unit_price}</p>
                          <p className="font-medium text-gray-900">Total: €{item.total_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} HEAD Hub Order
              </h2>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Order #{selectedOrder.id.slice(-8)} by {selectedOrder.athlete_name}
                </p>
              </div>

              {/* Pricing Section for Approval */}
              {approvalAction === 'approve' && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Set Pricing:</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 flex-1">{item.product_name}</span>
                        <input
                          type="number"
                          placeholder="Unit Price"
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                          onChange={(e) =>
                            updatePricing(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-sm text-gray-600">×</span>
                        <span className="text-sm text-gray-600 w-8">{item.quantity}</span>
                        <span className="text-sm text-gray-600">=</span>
                        <span className="text-sm font-medium w-16">
                          €{((pricing[item.id]?.unitPrice || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HEAD Hub Manager Notes:
                </label>
                <textarea
                  rows={3}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about this order..."
                />
              </div>

              {/* SAP Integration */}
              {approvalAction === 'approve' && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sendToSAP}
                      onChange={(e) => setSendToSAP(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Send directly to SAP after approval
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproval}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'} Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
