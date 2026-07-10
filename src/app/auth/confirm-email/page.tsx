'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button/Button';
import styles from '../AuthForm.module.css';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const context = searchParams.get('context') === 'reset' ? 'reset' : 'signup';

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResend = async () => {
    if (!email) return;
    setStatus('sending');

    const endpoint = context === 'reset' ? '/api/auth/reset-password' : '/api/auth/resend';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        setStatus('error');
      } else {
        setStatus('sent');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div>
      <h1 className={styles.heading}>Confirm your email address</h1>
      <p className={styles.subheading} style={{ marginBottom: '2.5rem' }}>
        Please check your email for the next step to signup.
      </p>

      {status === 'sent' && <div className={styles.success}>Email sent! Check your inbox.</div>}
      {status === 'error' && (
        <div className={styles.error}>Something went wrong sending the email. Please try again.</div>
      )}

      <div className={styles.stack}>
        <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || ''}`} style={{ width: '100%' }}>
          <Button type="button" variant="primary" fullWidth>
            CONTACT SUPPORT
          </Button>
        </a>
        <Button type="button" variant="dark" fullWidth onClick={handleResend} disabled={!email || status === 'sending'}>
          {status === 'sending' ? 'RESENDING...' : 'RESEND EMAIL'}
        </Button>
      </div>

      <div className={styles.stack} style={{ marginTop: '3rem' }}>
        <Link href="/auth/login" style={{ width: '100%' }}>
          <Button type="button" variant="dark" fullWidth>
            BACK TO LOGIN
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
