import { useEffect, useState, useCallback } from 'react';

import { Address } from '@/components/AddressManager';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

export function useAddresses(userIdOverride?: string) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = userIdOverride ?? user?.id;

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('addresses')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveAddress = useCallback(
    async (address: Omit<Address, 'id'>) => {
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

        await fetchAddresses();
        return data;
      } catch (err) {
        console.error('Error saving address:', err);
        throw err;
      }
    },
    [userId, fetchAddresses],
  );

  const updateAddress = useCallback(
    async (addressId: string, updates: Partial<Omit<Address, 'id'>>) => {
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

        await fetchAddresses();
      } catch (err) {
        console.error('Error updating address:', err);
        throw err;
      }
    },
    [userId, fetchAddresses],
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
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

        await fetchAddresses();
      } catch (err) {
        console.error('Error deleting address:', err);
        throw err;
      }
    },
    [userId, fetchAddresses],
  );

  const setPreferredAddress = useCallback(
    async (addressId: string) => {
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

        await fetchAddresses();
      } catch (err) {
        console.error('Error setting preferred address:', err);
        throw err;
      }
    },
    [userId, fetchAddresses],
  );

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

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