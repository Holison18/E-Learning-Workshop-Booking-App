'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Phone } from 'lucide-react';
import styles from './Account.module.css';

const COUNTRY_CODES = [
  { code: '+233', label: 'GH +233' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+234', label: 'NG +234' },
  { code: '+27', label: 'ZA +27' },
  { code: '+254', label: 'KE +254' },
  { code: '+91', label: 'IN +91' },
  { code: '+86', label: 'CN +86' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+61', label: 'AU +61' },
  { code: '+81', label: 'JP +81' },
  { code: '+7', label: 'RU +7' },
  { code: '+55', label: 'BR +55' },
  { code: '+52', label: 'MX +52' },
  { code: '+39', label: 'IT +39' },
  { code: '+34', label: 'ES +34' },
  { code: '+82', label: 'KR +82' },
  { code: '+65', label: 'SG +65' },
  { code: '+60', label: 'MY +60' },
  { code: '+63', label: 'PH +63' },
  { code: '+62', label: 'ID +62' },
  { code: '+66', label: 'TH +66' },
  { code: '+84', label: 'VN +84' },
  { code: '+20', label: 'EG +20' },
  { code: '+212', label: 'MA +212' },
  { code: '+256', label: 'UG +256' },
  { code: '+255', label: 'TZ +255' },
  { code: '+260', label: 'ZM +260' },
  { code: '+263', label: 'ZW +263' },
];

export default function AccountPage() {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');

  const parsePhone = (full: string) => {
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (full.startsWith(c.code)) {
        return { country: c.code, number: full.slice(c.code.length) };
      }
    }
    return { country: '+233', number: full };
  };
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      setEmail(user.email || '');
      const fullPhone = user.phone || user.user_metadata?.phone || '';
      if (fullPhone) {
        const parsed = parsePhone(fullPhone);
        setPhoneCountry(parsed.country);
        setPhoneNumber(parsed.number);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setMessage({ type: 'error', text: 'First name cannot be empty.' });
      return;
    }

    if (!trimmedLast) {
      setMessage({ type: 'error', text: 'Last name cannot be empty.' });
      return;
    }

    setIsSaving(true);

    const fullPhone = phoneCountry + phoneNumber.replace(/\s/g, '');

    try {
      const { data, error } = await supabase.auth.updateUser({
        phone: fullPhone,
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          phone: fullPhone,
        }
      });

      if (error) {
        throw error;
      }

      setFirstName(trimmedFirst);
      setLastName(trimmedLast);
      setMessage({ type: 'success', text: 'Account updated successfully. Refresh to see changes across the app.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update account.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Account</h1>
        <p className={styles.subtitle}>Update your personal details here. Your first and last name will appear on your certificates.</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              className={styles.input} 
              value={email} 
              disabled 
            />
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>Your email address cannot be changed.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} htmlFor="firstName">First Name</label>
              <input 
                id="firstName"
                type="text" 
                className={styles.input} 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} htmlFor="lastName">Last Name</label>
              <input 
                id="lastName"
                type="text" 
                className={styles.input} 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
            <label className={styles.label}>Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
                className={styles.input}
                style={{ width: 'auto', maxWidth: '130px', padding: '0.625rem 0.5rem', fontSize: '0.875rem' }}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                className={styles.input}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                style={{ flex: 1 }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Phone size={12} /> Used for SMS notifications about your bookings.
            </p>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
