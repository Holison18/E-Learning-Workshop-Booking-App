'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from '../AuthForm.module.css';
import promptStyles from '@/components/participant/ProfilePromptModal.module.css';

const COUNTRY_CODES = [
  { code: '+233', label: 'GH (+233)' },
  { code: '+234', label: 'NG (+234)' },
  { code: '+254', label: 'KE (+254)' },
  { code: '+27', label: 'ZA (+27)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    password: ''
  });
  const [countryCode, setCountryCode] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    if (val.length > 9) val = val.substring(0, 9);
    setPhoneNumber(val);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    setError('');

    const fullPhone = `${countryCode}${phoneNumber}`;

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: fullPhone,
        },
      },
    });

    if (authError) {
      // Check for rate limit error specifically
      if (authError.message.toLowerCase().includes('rate limit')) {
        setError('We are receiving too many signup requests right now. Please try again in an hour, or contact support.');
      } else {
        setError(authError.message);
      }
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
          phone: fullPhone,
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
        <div className={styles.row} style={{ alignItems: 'flex-start' }}>
          <div className={promptStyles.phoneGroup} style={{ gap: '0.25rem' }}>
            <label className={promptStyles.phoneLabel}>Phone Number <span style={{ color: 'var(--primary-red)' }}>*</span></label>
            <div className={promptStyles.phoneInputContainer}>
              <select
                className={promptStyles.countrySelect}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country Code"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                className={promptStyles.phoneInput}
                placeholder="XXXXXXXXX"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                aria-label="Phone Number"
              />
            </div>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            <Input
              label="Institution (Optional)"
              name="organization"
              placeholder="KNUST"
              value={formData.organization}
              onChange={handleChange}
            />
          </div>
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
