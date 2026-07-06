'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Phone, Building2, AlertCircle, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const missingContact = searchParams.get('missing') === 'contact';
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [institution, setInstitution] = useState('');

  const parsePhone = (full: string) => {
    const withPlus = full.startsWith('+') ? full : '+' + full;
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (withPlus.startsWith(c.code)) {
        return { country: c.code, number: withPlus.slice(c.code.length).replace(/^0+/, '') };
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
      setInstitution(user.user_metadata?.institution || '');
      const fullPhone = user.user_metadata?.phone || user.phone || '';
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

    const digits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    const fullPhone = phoneCountry + digits;

    if (!digits) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
      setIsSaving(false);
      return;
    }

    if (fullPhone.length > 15) {
      setMessage({ type: 'error', text: 'Phone number is too long. Please check and try again.' });
      setIsSaving(false);
      return;
    }

    if (fullPhone.length < 8) {
      setMessage({ type: 'error', text: 'Phone number is too short. Please enter the full number.' });
      setIsSaving(false);
      return;
    }

    if (!institution.trim()) {
      setMessage({ type: 'error', text: 'Please enter your institution name.' });
      setIsSaving(false);
      return;
    }

    try {
      console.log('Saving:', { phoneCountry, phoneNumber, digits: phoneNumber.replace(/\D/g, '').replace(/^0+/, ''), fullPhone, trimmedFirst, trimmedLast, institution: institution.trim() });
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          phone: fullPhone,
          institution: institution.trim(),
        }
      });

      if (updateError) {
        console.warn('updateUser failed, trying API fallback:', updateError.message);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw updateError;
        const apiRes = await fetch('/api/account/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            phone: fullPhone,
            first_name: trimmedFirst,
            last_name: trimmedLast,
            institution: institution.trim(),
          }),
        });
        const apiBody = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          throw new Error(apiBody.error || 'Save failed');
        }
        console.log('API fallback succeeded:', apiBody);
        const syncRes = await supabase.auth.updateUser({ data: { first_name: trimmedFirst, last_name: trimmedLast, phone: fullPhone, institution: institution.trim() } });
        if (syncRes.error) console.warn('post-fallback sync failed:', syncRes.error.message);
      } else {
        console.log('updateUser succeeded');
      }

      setFirstName(trimmedFirst);
      setLastName(trimmedLast);
      setMessage({ type: 'success', text: 'Account updated successfully.' });
    } catch (err: any) {
      console.error('Account update error:', err);
      const msg = typeof err === 'string' ? err : err?.message || err?.error || '';
      if (!msg || msg.includes('AuthRetryableFetchError') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
        setMessage({ type: 'error', text: 'Could not save. Please check your connection and try again.' });
      } else if (msg.includes('phone_number') || msg.includes('phone')) {
        setMessage({ type: 'error', text: 'This phone number is already in use.' });
      } else if (msg.includes('duplicate key') || msg.includes('already exists')) {
        setMessage({ type: 'error', text: 'This phone number is already registered.' });
      } else {
        setMessage({ type: 'error', text: msg || 'Save failed. Please try again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      {missingContact && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '1rem 1.25rem', background: '#FEF2F2', borderRadius: '10px',
            border: '1px solid #FECACA', marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#991B1B', fontSize: '0.875rem' }}>Contact info required</strong>
            <p style={{ color: '#991B1B', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
              Please provide your phone number and institution below before booking a workshop.
            </p>
          </div>
          <button
            onClick={() => window.history.replaceState(null, '', '/account')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', padding: '0.25rem', display: 'flex', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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

          <div className={styles.formGroup}>
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
                required
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Phone size={12} /> Used for SMS notifications about your bookings.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Institution</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Building2 size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <input
                type="text"
                className={styles.input}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Kwame Nkrumah University of Science and Technology"
                required
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
              Your affiliated university, college, or organization.
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
