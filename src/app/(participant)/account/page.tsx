'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './Account.module.css';

export default function AccountPage() {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (error) {
        throw error;
      }

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
        <p className={styles.subtitle}>Update your personal details here.</p>
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
              />
            </div>
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
