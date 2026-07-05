'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { requestApi } from '@/lib/api';

type AdminInfo = {
  id: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminInfo: AdminInfo | null;
  refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  adminInfo: null,
  refreshAdmin: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const loading = !supabaseLoaded || !adminChecked;

  async function checkAdminStatus(userId: string) {
    try {
      const response = await requestApi<{ data?: { id: string }[] }>('/api/admin/admin');
      const admin = response?.data?.find((admin) => admin.id === userId);
      setIsAdmin(!!admin);
      if (admin) {
        setAdminInfo({ id: admin.id, email: '', role: '' });
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      }
      if (active) setSupabaseLoaded(true);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setAdminInfo(null);
          setSupabaseLoaded(true);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        setAdminInfo(null);
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      if (data?.admin) {
        setAdminInfo(data.admin);
        setIsAdmin(true);
      } else {
        setAdminInfo(null);
        setIsAdmin(false);
      }
    } catch {
      setAdminInfo(null);
      setIsAdmin(false);
    } finally {
      setAdminChecked(true);
    }
  }, []);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminInfo, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
