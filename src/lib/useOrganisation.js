import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

let cachedOrg = null;
let cachedUser = null;

export default function useOrganisation() {
  const { user: authUser } = useAuth();
  const [org, setOrg] = useState(cachedOrg);
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedOrg);

  useEffect(() => {
    if (!authUser) return;

    if (cachedOrg && cachedUser && cachedUser.id === authUser.id) {
      setOrg(cachedOrg);
      setUser(cachedUser);
      setLoading(false);
      return;
    }
    // Different user — clear stale cache
    cachedOrg = null;
    cachedUser = null;

    async function load() {
      try {
        // Fetch profile from public.users
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (error) throw error;

        const me = { ...authUser, ...profile };
        cachedUser = me;
        setUser(me);

        if (me?.organisation_id) {
          const { data: orgData } = await supabase
            .from('organisations')
            .select('*')
            .eq('id', me.organisation_id)
            .single();
          if (orgData) {
            cachedOrg = orgData;
            setOrg(orgData);
          }
        }
      } catch (_) {
        // Not authenticated — AuthContext will handle redirect to login
      }
      setLoading(false);
    }
    load();
  }, [authUser]);

  const refreshOrg = async () => {
    if (user?.organisation_id) {
      const { data: orgData } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', user.organisation_id)
        .single();
      if (orgData) {
        cachedOrg = orgData;
        setOrg(orgData);
      }
    }
  };

  const refreshUser = async () => {
    if (!authUser) return;
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    const me = { ...authUser, ...profile };
    cachedUser = me;
    setUser(me);
  };

  const clearCache = () => {
    cachedOrg = null;
    cachedUser = null;
  };

  return { org, user, loading, refreshOrg, refreshUser, clearCache };
}
