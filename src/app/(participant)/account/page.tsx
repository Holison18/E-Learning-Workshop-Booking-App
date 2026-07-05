'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { getFirstLastName } from '@/lib/user';
import { Pencil, X } from 'lucide-react';
import styles from './Account.module.css';
import promptStyles from '@/components/participant/ProfilePromptModal.module.css';

const COUNTRY_CODES = [
  { code: '+233', label: 'GH (+233)' },
  { code: '+234', label: 'NG (+234)' },
  { code: '+254', label: 'KE (+254)' },
  { code: '+27', label: 'ZA (+27)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
];

export default function AccountPage() {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [originalData, setOriginalData] = useState({ firstName: '', lastName: '', countryCode: '+233', phoneNumber: '' });

  const hasGoogleAvatar = Boolean(user?.user_metadata?.avatar_url || user?.user_metadata?.picture);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('participants').select('first_name, last_name, phone').eq('id', user.id).maybeSingle();
        let fname = '', lname = '', cCode = '+233', pNum = '';
        if (data) {
          fname = data.first_name || '';
          lname = data.last_name || '';
          if (data.phone && data.phone !== 'Not provided') {
            const match = COUNTRY_CODES.find(c => data.phone.startsWith(c.code));
            if (match) {
              cCode = match.code;
              pNum = data.phone.substring(match.code.length);
            } else {
              pNum = data.phone;
            }
          }
        } else {
          const hasKnownName = Boolean(user.user_metadata?.first_name || user.user_metadata?.full_name || user.user_metadata?.name);
          const { firstName: resolvedFirstName, lastName: resolvedLastName } = getFirstLastName(user);
          fname = hasKnownName ? resolvedFirstName : '';
          lname = hasKnownName ? resolvedLastName : '';
        }
        setFirstName(fname);
        setLastName(lname);
        setCountryCode(cCode);
        setPhoneNumber(pNum);
        setOriginalData({ firstName: fname, lastName: lname, countryCode: cCode, phoneNumber: pNum });
      };
      fetchProfile();
      setEmail(user.email || '');
    }
  }, [user]);

  const handleCancelEdit = () => {
    setFirstName(originalData.firstName);
    setLastName(originalData.lastName);
    setCountryCode(originalData.countryCode);
    setPhoneNumber(originalData.phoneNumber);
    setIsEditingName(false);
    setMessage(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    if (val.length > 9) val = val.substring(0, 9);
    setPhoneNumber(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (error) {
        throw error;
      }

      const fullPhone = `${countryCode}${phoneNumber}`;

      if (user) {
        await supabase.from('participants').upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: fullPhone
        }, { onConflict: 'id' });
      }

      setOriginalData({ firstName, lastName, countryCode, phoneNumber });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setIsEditingName(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update account.' });
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = `${firstName} ${lastName}`.trim() || email;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Account</h1>
        <p className={styles.subtitle}>Update your personal details here.</p>
      </div>

      <Card>
        <CardContent>
          <div className={styles.avatarRow}>
            <Avatar user={user} name={displayName} size={72} />
            <div>
              <div className={styles.avatarName}>{displayName}</div>
              {hasGoogleAvatar && (
                <p className={styles.avatarHint}>
                  Synced from your Google account.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <Input label="Email Address" id="email" type="email" value={email} disabled />
              <p className={styles.hint}>Your email address cannot be changed.</p>
            </div>

            <div className={styles.nameSectionHeader}>
              <span className={styles.nameSectionLabel}>Personal Details</span>
              {!isEditingName && (
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => setIsEditingName(true)}
                  aria-label="Edit name"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>

            <div className={styles.row}>
              <Input
                label="First Name"
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditingName}
                required
              />
              <Input
                label="Last Name"
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditingName}
              />
            </div>

            <div className={promptStyles.phoneGroup} style={{ marginTop: '1rem', opacity: isEditingName ? 1 : 0.7 }}>
              <label className={promptStyles.phoneLabel}>Phone Number</label>
              <div className={promptStyles.phoneInputContainer}>
                <select
                  className={promptStyles.countrySelect}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={!isEditingName}
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
                  disabled={!isEditingName}
                  required
                  aria-label="Phone Number"
                />
              </div>
            </div>

            {isEditingName && (
              <div className={styles.editActions}>
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  <X size={16} style={{ marginRight: '0.375rem' }} /> Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}

            {message && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
