import { useEffect, useState } from 'react';

import { Address } from '@/components/AddressManager';
import { supabaseClient } from '@/lib/supabase-client';

export function useAddresses(userId?: string) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async () => {
    if (!userId) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabaseClient
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_preferred', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const formattedAddresses: Address[] = (data || []).map(addr => ({
        id: addr.id,
        name: addr.name,
        addressLine1: addr.address_line1,
        addressLine2: addr.address_line2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
        phone: addr.phone,
        isPreferred: addr.is_preferred,
      }));

      setAddresses(formattedAddresses);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = async (address: Omit<Address, 'id'>) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const { data, error: saveError } = await supabaseClient
        .from('addresses')
        .insert({
          user_id: userId,
          name: address.name,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2,
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          country: address.country,
          phone: address.phone,
          is_preferred: address.isPreferred,
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Refresh addresses
      await fetchAddresses();
      return data;
    } catch (err) {
      console.error('Error saving address:', err);
      throw err;
    }
  };

  const updateAddress = async (addressId: string, updates: Partial<Omit<Address, 'id'>>) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.addressLine1 !== undefined) updateData.address_line1 = updates.addressLine1;
      if (updates.addressLine2 !== undefined) updateData.address_line2 = updates.addressLine2;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.isPreferred !== undefined) updateData.is_preferred = updates.isPreferred;

      const { error: updateError } = await supabaseClient
        .from('addresses')
        .update(updateData)
        .eq('id', addressId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Refresh addresses
      await fetchAddresses();
    } catch (err) {
      console.error('Error updating address:', err);
      throw err;
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const { error: deleteError } = await supabaseClient
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh addresses
      await fetchAddresses();
    } catch (err) {
      console.error('Error deleting address:', err);
      throw err;
    }
  };

  const setPreferredAddress = async (addressId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // First, unset all preferred addresses for this user
      await supabaseClient.from('addresses').update({ is_preferred: false }).eq('user_id', userId);

      // Then set the selected address as preferred
      const { error: updateError } = await supabaseClient
        .from('addresses')
        .update({ is_preferred: true })
        .eq('id', addressId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Refresh addresses
      await fetchAddresses();
    } catch (err) {
      console.error('Error setting preferred address:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    saveAddress,
    updateAddress,
    deleteAddress,
    setPreferredAddress,
  };
}
