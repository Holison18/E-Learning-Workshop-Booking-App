'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { GraduationCap, LogIn } from 'lucide-react';

export default function WorkshopsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</div>;

  if (user) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
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
        <Link href="/workshops" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#111', fontWeight: 700, fontSize: '1.05rem' }}>
          <GraduationCap size={22} color="#DC2626" />
          KNUST E-Learning
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1.25rem',
              background: '#DC2626', color: '#fff', textDecoration: 'none',
              borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
          >
            <LogIn size={16} /> Sign In
          </Link>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: '1140px', margin: '0 auto', padding: '2rem 1rem', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
