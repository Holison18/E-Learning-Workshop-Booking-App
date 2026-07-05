'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, LogIn, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</div>;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#111', fontWeight: 700, fontSize: '1.05rem' }}>
          <GraduationCap size={22} color="#DC2626" />
          KNUST E-Learning
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1.25rem',
                  background: '#DC2626', color: '#fff', textDecoration: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1.25rem',
                  background: 'transparent', color: '#666',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                href="/auth/register"
                style={{
                  padding: '0.5rem 1.25rem',
                  color: '#A32020', textDecoration: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1.25rem',
                  background: '#DC2626', color: '#fff', textDecoration: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                <LogIn size={16} /> Sign In
              </Link>
            </div>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
