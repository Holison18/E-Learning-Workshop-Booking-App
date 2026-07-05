'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If they are already logged in and are an admin, redirect immediately
    if (!authLoading && user && isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: adminRow } = await supabase
      .from('admins')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!adminRow) {
      // Not an admin, log them out
      await supabase.auth.signOut();
      setError('Unauthorized: Admin access required.');
      setLoading(false);
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get('redirectTo');

    router.push(redirectTo || '/admin/dashboard');
    router.refresh();
  };

  if (authLoading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-off-white)', padding: '1rem' }}>
      <Card style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ 
          backgroundColor: 'var(--secondary-black)', 
          color: 'white', 
          padding: '2rem', 
          textAlign: 'center',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <ShieldAlert size={48} style={{ margin: '0 auto 1rem', color: 'var(--primary-red)' }} />
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'white' }}>
            Admin Portal
          </h1>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', opacity: 0.8 }}>Sign in with your staff credentials</p>
        </div>
        
        <CardContent style={{ padding: '2rem' }}>
          {error && <div style={{ color: 'var(--primary-red)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(211, 47, 47, 0.1)', borderRadius: '6px', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              aria-label="Email Address"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              aria-label="Password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'SIGNING IN...' : 'LOGIN'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
