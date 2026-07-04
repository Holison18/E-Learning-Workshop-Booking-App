'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from '../AuthForm.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/auth/confirm-email?context=reset&email=${encodeURIComponent(email)}`);
  };

  return (
    <div>
      <h1 className={styles.heading}>Forgot your password?</h1>
      <p className={styles.subheading}>
        Enter the email address linked to your account and we&apos;ll send you a link to reset your password.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Sending link...' : 'Send reset link'}
        </Button>
      </form>

      <div className={styles.stack}>
        <Link href="/auth/login" style={{ width: '100%' }}>
          <Button type="button" variant="dark" fullWidth>
            Back to login
          </Button>
        </Link>
      </div>
    </div>
  );
}
