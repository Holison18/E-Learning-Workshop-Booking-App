'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import styles from '../AuthForm.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    router.push('/dashboard');
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

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.75rem 1rem',
          background: '#FEF2F2', borderRadius: '10px',
          border: '1px solid #FECACA',
          color: '#991B1B',
          fontSize: '0.875rem', fontWeight: 500,
          marginBottom: '1rem',
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className={styles.form}>
        <Input
          aria-label="Email Address"
          type="email"
          placeholder="Email Address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div style={{ position: 'relative' }}>
          <Input
            aria-label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--secondary-gray)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

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
