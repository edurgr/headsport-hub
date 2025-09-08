'use client';

import { useState } from 'react';
import ResponsiveSelect from './ResponsiveSelect';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuth } from '@/contexts/AuthContext';

export interface Address {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPreferred: boolean;
  phone?: string;
}

interface AddressManagerProps {
  addresses?: Address[]; // Optional for backward compatibility
  onAddressesChange?: (addresses: Address[]) => void; // Optional for backward compatibility
  onSelectAddress?: (address: Address) => void;
  selectMode?: boolean;
  useDatabase?: boolean; // New prop to enable database integration
}

export default function AddressManager({ 
  addresses: propAddresses, 
  onAddressesChange, 
  onSelectAddress,
  selectMode = false,
  useDatabase = false
}: AddressManagerProps) {
  const { user } = useAuth();
  const { 
    addresses: dbAddresses, 
    loading, 
    error, 
    saveAddress, 
    updateAddress, 
    deleteAddress, 
    setPreferredAddress 
  } = useAddresses(useDatabase ? user?.id : undefined);

  // Use database addresses if useDatabase is true, otherwise use prop addresses
  const addresses = useDatabase ? dbAddresses : (propAddresses || []);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Austria',
    isPreferred: false,
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAddress) {
        // Update existing address
        if (useDatabase) {
          await updateAddress(editingAddress.id, formData as Partial<Omit<Address, 'id'>>);
        } else {
          const updatedAddresses = addresses.map(addr => 
            addr.id === editingAddress.id 
              ? { ...formData, id: addr.id } as Address
              : addr
          );
          onAddressesChange?.(updatedAddresses);
        }
        setEditingAddress(null);
      } else {
        // Add new address
        if (useDatabase) {
          await saveAddress(formData as Omit<Address, 'id'>);
        } else {
          const newAddress: Address = {
            id: `addr-${Date.now()}`,
            ...formData as Omit<Address, 'id'>
          };
          
          // If this is the first address or marked as preferred, make it preferred
          if (addresses.length === 0 || newAddress.isPreferred) {
            const updatedAddresses = addresses.map(addr => ({ ...addr, isPreferred: false }));
            updatedAddresses.push(newAddress);
            onAddressesChange?.(updatedAddresses);
          } else {
            onAddressesChange?.([...addresses, newAddress]);
          }
        }
      }
      
      setShowForm(false);
      setFormData({
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Austria',
        isPreferred: false,
        phone: ''
      });
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address. Please try again.');
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowForm(true);
  };

  const handleDelete = async (addressId: string) => {
    try {
      if (useDatabase) {
        await deleteAddress(addressId);
      } else {
        const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
        onAddressesChange?.(updatedAddresses);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address. Please try again.');
    }
  };

  const handleSetPreferred = async (addressId: string) => {
    try {
      if (useDatabase) {
        await setPreferredAddress(addressId);
      } else {
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          isPreferred: addr.id === addressId
        }));
        onAddressesChange?.(updatedAddresses);
      }
    } catch (error) {
      console.error('Error setting preferred address:', error);
      alert('Failed to set preferred address. Please try again.');
    }
  };

  const handleSelect = (address: Address) => {
    if (onSelectAddress) {
      onSelectAddress(address);
    }
  };

  // Show loading state
  if (useDatabase && loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--info))] mx-auto"></div>
          <p className="mt-2 text-sm text-[hsl(var(--muted))]">Loading addresses...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (useDatabase && error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-[hsl(var(--error))] mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[hsl(var(--error))] mb-4">Failed to load addresses</p>
          <button
            onClick={() => window.location.reload()}
            className="btn px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Address List */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Your Addresses</h3>
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`p-4 surface-card transition-shadow ${
                address.isPreferred ? 'ring-1 ring-[hsl(var(--foreground))]' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{address.name}</h4>
                    {address.isPreferred && (
                      <span className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--secondary))] ring-1 ring-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                        Preferred
                      </span>
                    )}
                  </div>
                  <p className="text-[hsl(var(--muted))]">{address.addressLine1}</p>
                  {address.addressLine2 && (
                    <p className="text-[hsl(var(--muted))]">{address.addressLine2}</p>
                  )}
                  <p className="text-[hsl(var(--muted))]">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-[hsl(var(--muted))]">{address.country}</p>
                  {address.phone && (
                    <p className="text-[hsl(var(--muted))]">{address.phone}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:gap-2 w-full sm:w-auto">
                  {selectMode && (
                    <button
                      onClick={() => handleSelect(address)}
                      className="btn px-3 h-9 inline-flex items-center text-sm"
                    >
                      Select
                    </button>
                  )}
                  
                  {!address.isPreferred && (
                    <button
                      onClick={() => handleSetPreferred(address.id)}
                      className="btn px-3 h-9 inline-flex items-center text-sm"
                    >
                      Set Preferred
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleEdit(address)}
                    className="px-3 h-9 inline-flex items-center rounded-md text-sm hover:opacity-80"
                    style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="btn-delete px-3 h-9 inline-flex items-center text-sm"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="surface-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Address Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Home, Office, Vacation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Address Line 1
                </label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="input"
                  placeholder="Street address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.addressLine2 || ''}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className="input"
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                  placeholder="City"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="input"
                  placeholder="State or Province"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="input"
                  placeholder="Postal Code"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Country
                </label>
                <div style={{ backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
                  <ResponsiveSelect
                    ariaLabel="Country"
                    value={formData.country || ''}
                    onChange={(v) => setFormData({ ...formData, country: v })}
                    className="w-full px-3 h-11 sm:h-9 rounded-md bg-transparent"
                    options={[
                      { value: 'Austria', label: 'Austria' },
                      { value: 'Germany', label: 'Germany' },
                      { value: 'Switzerland', label: 'Switzerland' },
                      { value: 'Italy', label: 'Italy' },
                      { value: 'France', label: 'France' },
                      { value: 'United States', label: 'United States' },
                      { value: 'Canada', label: 'Canada' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="Phone number (optional)"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPreferred"
                checked={formData.isPreferred}
                onChange={(e) => setFormData({ ...formData, isPreferred: e.target.checked })}
                className="w-4 h-4 text-[hsl(var(--foreground))] border-[hsl(var(--border))] rounded focus:ring-[hsl(var(--foreground))]"
              />
              <label htmlFor="isPreferred" className="text-sm">
                Set as preferred address
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAddress(null);
                  setFormData({
                    name: '',
                    addressLine1: '',
                    addressLine2: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'Austria',
                    isPreferred: false,
                    phone: ''
                  });
                }}
                className="px-4 h-10 inline-flex items-center rounded-md hover:opacity-80"
                style={{ backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn px-4 h-10 inline-flex items-center"
              >
                {editingAddress ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Address Button */}
      {!showForm && !selectMode && (
        <button
          onClick={() => setShowForm(true)}
          className="btn px-4 h-10 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Address
        </button>
      )}
      
      {/* Link to Profile for Address Management when in selectMode */}
      {selectMode && (
        <div className="text-center py-4">
          <p className="text-sm text-[hsl(var(--muted))] mb-2">Need to add a new address?</p>
          <a 
            href="/profile" 
            className="text-[hsl(var(--foreground))] hover:opacity-80 text-sm font-medium underline"
          >
            Manage addresses in your Profile
          </a>
        </div>
      )}
    </div>
  );
}
