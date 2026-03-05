/**
 * React Hook for CRM Addons
 * Easy way to use addons in components
 */

'use client';

import { useEffect, useState } from 'react';
import { CRMAddon } from '@/lib/crm/addons.types';

/**
 * useCRMAddons - Load and manage addon state
 * @returns Object with addon data and helper functions
 */
export function useCRMAddons() {
  const [addons, setAddons] = useState<CRMAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/addons');
      if (!response.ok) throw new Error('Failed to load addons');
      const data = await response.json();
      setAddons(data.addons || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const getAddonById = (id: string) => addons.find((a) => a.id === id);

  const getAddonsByCategory = (category: CRMAddon['category']) =>
    addons.filter((a) => a.category === category);

  const isAddonEnabled = (id: string) => {
    const addon = getAddonById(id);
    return addon?.enabled ?? false;
  };

  const toggleAddon = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/crm/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId: id, enabled }),
      });

      if (!response.ok) throw new Error('Failed to toggle addon');

      // Update local state
      setAddons((prev) =>
        prev.map((addon) => (addon.id === id ? { ...addon, enabled } : addon))
      );
    } catch (err) {
      console.error('Error toggling addon:', err);
    }
  };

  return {
    addons,
    loading,
    error,
    getAddonById,
    getAddonsByCategory,
    isAddonEnabled,
    toggleAddon,
    refetch: loadAddons,
  };
}

/**
 * Hook to get specific addon
 */
export function useAddon(addonId: string) {
  const { addons, loading } = useCRMAddons();
  const addon = addons.find((a) => a.id === addonId);

  return {
    addon,
    isEnabled: addon?.enabled ?? false,
    isLoading: loading,
  };
}
