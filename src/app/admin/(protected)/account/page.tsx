'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { requestApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ShieldPlus, X, AlertCircle } from 'lucide-react';
import styles from './AdminAccount.module.css';

type AdminRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'super_admin' | 'admin';
};

const roleLabel: Record<AdminRow['role'], string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
};

export default function AdminAccountPage() {
  const { user, adminInfo } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'admin' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function fetchAdmins() {
    const response = await requestApi<{ data: AdminRow[] }>('/api/admin/admin');
    setAdmins(response.data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchAdmins();
    })();
  }, []);

  const currentAdmin = admins.find((a) => a.id === adminInfo?.id);
  const isSuperAdmin = currentAdmin?.role === 'super_admin';
  const displayName = currentAdmin?.first_name
    ? `${currentAdmin.first_name} ${currentAdmin.last_name || ''}`.trim()
    : adminInfo?.email?.split('@')[0] || 'Admin';
  const displayEmail = currentAdmin?.email || adminInfo?.email || '';
  const displayRole = currentAdmin ? roleLabel[currentAdmin.role] : 'Administrator';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (passwordForm.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
      } else {
        setPasswordSuccess(true);
        setPasswordForm({ password: '', confirmPassword: '' });
        setChangingPassword(false);
      }
    } catch {
      setPasswordError('Network error');
    }
    setPasswordSaving(false);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this administrator? They will lose admin access.')) return;
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (!error) fetchAdmins();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const res = await fetch('/api/admin/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });

    const data = await res.json();

    if (!res.ok) {
      setCreateError(data.error || 'Failed to create admin');
      setCreating(false);
      return;
    }

    setShowCreateModal(false);
    setCreateForm({ first_name: '', last_name: '', email: '', password: '', role: 'admin' });
    await fetchAdmins();
    setCreating(false);
  };

  if (loading) return <div className={styles.emptyState}>Loading account...</div>;

  return (
    <div className={styles.page}>
      <div>
        <h1>Admin Account</h1>
        <p className={styles.subtitle}>Manage your profile, team members, and account preferences.</p>
      </div>

      <div className={styles.layout}>
        <Card>
          <CardContent className={styles.profileCard}>
            <div className={styles.avatar}>{initials || '?'}</div>
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileRole}>{displayRole} · KNUST E-Learning Portal</div>

            <div className={styles.infoRow}>
              Email: {displayEmail}
            </div>
            <div className={styles.infoRow}>
              Role: {displayRole}
            </div>

            <div className={styles.sectionDivider}>
              <div className={styles.sectionLabel}>Security</div>
              {passwordSuccess && !changingPassword && (
                <div style={{ color: 'var(--success-green)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                  Password updated successfully.
                </div>
              )}
              {!changingPassword ? (
                <Button type="button" variant="dark" fullWidth onClick={() => setChangingPassword(true)}>
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                  {passwordError && <div style={{ color: 'var(--primary-red)', fontSize: '0.8125rem' }}>{passwordError}</div>}
                  <Input
                    label="New password"
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button type="button" variant="outline" fullWidth onClick={() => setChangingPassword(false)}>Cancel</Button>
                    <Button type="submit" fullWidth disabled={passwordSaving}>{passwordSaving ? 'Saving...' : 'Save'}</Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className={styles.teamHeader}>
              <h2 className={styles.teamTitle}>Team Management</h2>
              {isSuperAdmin && (
                <Button type="button" onClick={() => setShowCreateModal(true)}>
                  <ShieldPlus size={16} style={{ marginRight: '0.375rem' }} />
                  Create Admin
                </Button>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Administrator</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 && (
                    <tr><td colSpan={3} className={styles.emptyState}>No administrators yet.</td></tr>
                  )}
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.adminName}>
                          {a.first_name ? `${a.first_name} ${a.last_name || ''}` : 'Unknown'}
                          {a.id === adminInfo?.id && ' (you)'}
                        </div>
                        <div className={styles.adminEmail}>{a.email || '—'}</div>
                      </td>
                      <td><Badge variant={a.role === 'super_admin' ? 'primary' : 'info'}>{roleLabel[a.role]}</Badge></td>
                      <td>
                        <div className={styles.actionCell}>
                          {a.id !== adminInfo?.id && (
                            <button
                              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                              onClick={() => handleRemove(a.id)}
                              aria-label="Remove admin"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Create Admin Modal ── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => { if (!creating) setShowCreateModal(false); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px',
              width: '100%', maxWidth: '440px',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Create New Admin
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px',
                color: '#991B1B', fontSize: '0.875rem', marginBottom: '1rem',
              }}>
                <AlertCircle size={16} />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    First Name
                  </label>
                  <input
                    required
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB', borderRadius: '8px',
                      fontSize: '0.875rem', outline: 'none',
                    }}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Last Name
                  </label>
                  <input
                    required
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB', borderRadius: '8px',
                      fontSize: '0.875rem', outline: 'none',
                    }}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB', borderRadius: '8px',
                    fontSize: '0.875rem', outline: 'none',
                  }}
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Password
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB', borderRadius: '8px',
                    fontSize: '0.875rem', outline: 'none',
                  }}
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB', borderRadius: '8px',
                    fontSize: '0.875rem', outline: 'none', background: '#fff',
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'transparent', color: '#666', border: '1px solid #D1D5DB',
                    borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: '#DC2626', color: '#fff', border: 'none',
                    borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
