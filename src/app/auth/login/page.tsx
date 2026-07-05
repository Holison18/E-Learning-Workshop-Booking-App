'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { requestApi } from '@/lib/api';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import styles from '../AuthForm.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const adminsResponse = await requestApi<{ data: { id: string }[] }>('/api/admin/admin');
    const isAdmin = adminsResponse.data.some((admin) => admin.id === data.user.id);

    router.push(isAdmin ? '/admin/dashboard' : '/dashboard');
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h1 className={styles.heading}>Sign in</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleLogin} className={styles.form}>
        <Input
          aria-label="Email Address"
          type="email"
          placeholder="Email Address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          aria-label="Password"
          type="password"
          placeholder="Password *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className={styles.actionsRow}>
          <Button type="submit" disabled={loading}>
            {loading ? 'SIGNING IN...' : 'LOGIN'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Button>
          <Link href="/auth/forgot-password" className={styles.helperLink}>
            Forgot your password?
          </Link>
        </div>
      </form>

      <div className={styles.divider}>Or</div>

      <button type="button" className={styles.googleButton} onClick={handleGoogleLogin} disabled={googleLoading}>
        <GoogleIcon size={18} />
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>

      <div className={styles.stack}>
        <Link href="/auth/register" style={{ width: '100%' }}>
          <Button type="button" variant="dark" fullWidth>
            CREATE NEW ACCOUNT
          </Button>
        </Link>
      </div>
    </div>
  );
}
