'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Button } from '@/components/ui/button/Button';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import { countryCodes } from '@/lib/country-codes';
import styles from '../AuthForm.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+233',
    phone: '',
    organization: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedFirst = formData.firstName.trim();
    const trimmedLast = formData.lastName.trim();
    const trimmedOrg = formData.organization.trim();
    const fullPhone = `${formData.countryCode}${formData.phone.trim()}`;

    if (!trimmedFirst || !trimmedLast) {
      setError('First and last name are required and cannot be just spaces.');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    if (!trimmedOrg) {
      setError('Institution / Organization is required.');
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('participants').insert([
        {
          id: authData.user.id,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: formData.email,
          phone: fullPhone,
          organization_name: trimmedOrg,
        }
      ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      if (authData.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        router.push(`/auth/confirm-email?email=${encodeURIComponent(formData.email)}`);
      }
    }
  };

  const handleGoogleSignUp = async () => {
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
          <div style={{ flex: '0 0 130px', minWidth: 0 }}>
            <Select
              label="Code"
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.country} ({c.code})
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="XXXXXXXXX"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        <Input
          label="Institution / Organization"
          name="organization"
          placeholder="KNUST"
          value={formData.organization}
          onChange={handleChange}
          required
        />
        <div style={{ position: 'relative' }}>
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
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
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
        </Button>
      </form>

      <div className={styles.divider}>Or</div>

      <button type="button" className={styles.googleButton} onClick={handleGoogleSignUp} disabled={googleLoading}>
        <GoogleIcon size={18} />
        {googleLoading ? 'Connecting...' : 'Sign up with Google'}
      </button>

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
