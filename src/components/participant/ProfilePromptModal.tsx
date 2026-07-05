'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from './ProfilePromptModal.module.css';

const COUNTRY_CODES = [
  { code: '+233', label: 'GH (+233)' },
  { code: '+234', label: 'NG (+234)' },
  { code: '+254', label: 'KE (+254)' },
  { code: '+27', label: 'ZA (+27)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
];

type ProfilePromptModalProps = {
  userId: string;
  email: string;
  initialFirstName: string;
  initialLastName: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ProfilePromptModal({
  userId,
  email,
  initialFirstName,
  initialLastName,
  onSuccess,
  onCancel,
}: ProfilePromptModalProps) {
  const [firstName, setFirstName] = useState(initialFirstName !== 'Unknown' ? initialFirstName : '');
  const [lastName, setLastName] = useState(initialLastName !== 'Unknown' ? initialLastName : '');
  const [countryCode, setCountryCode] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // only allow digits
    if (val.startsWith('0')) {
      val = val.substring(1); // remove leading zero
    }
    if (val.length > 9) {
      val = val.substring(0, 9); // limit to 9 digits
    }
    setPhoneNumber(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    const fullPhone = `${countryCode}${phoneNumber}`;

    const { error: profileError } = await supabase.from('participants').upsert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email,
      phone: fullPhone,
    }, { onConflict: 'id' });

    if (profileError) {
      setError('Failed to update profile: ' + profileError.message);
      setLoading(false);
      return;
    }

    onSuccess();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Complete Your Profile</h2>
            <p className={styles.subtitle}>
              We need a few details to finalize your account before you can book workshops.
            </p>
          </div>
          <button className={styles.closeButton} onClick={onCancel} aria-label="Cancel booking">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <Input
                label="First Name"
                name="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className={styles.phoneGroup}>
              <label className={styles.phoneLabel}>Phone Number</label>
              <div className={styles.phoneInputContainer}>
                <select
                  className={styles.countrySelect}
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
                  className={styles.phoneInput}
                  placeholder="XXXXXXXXX"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                  aria-label="Phone Number"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
