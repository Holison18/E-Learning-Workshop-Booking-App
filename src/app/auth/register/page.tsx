'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from '../AuthForm.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Create the participant profile
      const { error: profileError } = await supabase.from('participants').insert([
        {
          id: authData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          organization_name: formData.organization || null,
        }
      ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('Your account was created, but we could not set up your profile. Please contact support before booking workshops.');
        setLoading(false);
        return;
      }

      if (authData.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        // Email confirmation is required before a session is created
        router.push(`/auth/confirm-email?email=${encodeURIComponent(formData.email)}`);
      }
    }
  };

  return (
    <div>
      <h1 className={styles.heading}>
        Sign up to <span className={styles.highlight}>KNUST E-Learning Workshop Portal</span>
      </h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleRegister} className={styles.form}>
        <div className={styles.row}>
          <Input
            label="First name"
            name="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <Input
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <div className={styles.row}>
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+233XXXXXXXXX"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <Input
            label="Institution (Optional)"
            name="organization"
            placeholder="KNUST"
            value={formData.organization}
            onChange={handleChange}
          />
        </div>
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
        </Button>
      </form>

      <div className={styles.stack}>
        <Link href="/auth/login" style={{ width: '100%' }}>
          <Button type="button" variant="dark" fullWidth>
            BACK TO LOGIN
          </Button>
        </Link>
      </div>
    </div>
  );
}
