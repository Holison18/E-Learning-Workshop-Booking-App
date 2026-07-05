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

export default function AccountPage() {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const hasGoogleAvatar = Boolean(user?.user_metadata?.avatar_url || user?.user_metadata?.picture);

  useEffect(() => {
    if (user) {
      const hasKnownName = Boolean(user.user_metadata?.first_name || user.user_metadata?.full_name || user.user_metadata?.name);
      const { firstName: resolvedFirstName, lastName: resolvedLastName } = getFirstLastName(user);
      setFirstName(hasKnownName ? resolvedFirstName : '');
      setLastName(hasKnownName ? resolvedLastName : '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleCancelEdit = () => {
    if (user) {
      const { firstName: resolvedFirstName, lastName: resolvedLastName } = getFirstLastName(user);
      setFirstName(resolvedFirstName);
      setLastName(resolvedLastName);
    }
    setIsEditingName(false);
    setMessage(null);
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

      if (user) {
        await supabase.from('participants').update({ first_name: firstName, last_name: lastName }).eq('id', user.id);
      }

      setMessage({ type: 'success', text: 'Name updated successfully.' });
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
              <p className={styles.avatarHint}>
                {hasGoogleAvatar
                  ? 'Synced from your Google account.'
                  : 'Auto-generated based on your account — this updates if you sign in with Google.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <Input label="Email Address" id="email" type="email" value={email} disabled />
              <p className={styles.hint}>Your email address cannot be changed.</p>
            </div>

            <div className={styles.nameSectionHeader}>
              <span className={styles.nameSectionLabel}>Name</span>
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
