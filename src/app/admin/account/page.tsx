'use client';

import React, { useEffect, useState } from 'react';
import { Mail, ShieldCheck, UserPlus, Check, UserMinus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { useConfirm } from '@/components/ui/confirm-dialog/ConfirmDialogProvider';
import { Avatar } from '@/components/ui/avatar/Avatar';
import styles from './AdminAccount.module.css';

type AdminRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'super_admin' | 'coordinator';
  status: 'active' | 'pending';
};

const roleLabel: Record<AdminRow['role'], string> = {
  super_admin: 'Super Administrator',
  coordinator: 'Coordinator',
};

export default function AdminAccountPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'coordinator' as AdminRow['role'] });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  async function fetchAdmins() {
    const { data } = await supabase.from('admins').select('id, first_name, last_name, email, role, status').order('created_at', { ascending: true });
    if (data) setAdmins(data as AdminRow[]);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchAdmins();
    })();
  }, []);

  const currentAdmin = admins.find((a) => a.id === user?.id);
  const displayName = currentAdmin?.first_name
    ? `${currentAdmin.first_name} ${currentAdmin.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Admin';
  const displayEmail = currentAdmin?.email || user?.email || '';
  const displayRole = currentAdmin ? roleLabel[currentAdmin.role] : 'Administrator';

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
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setPasswordForm({ password: '', confirmPassword: '' });
      setChangingPassword(false);
    }
    setPasswordSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);

    const { data: participant, error: lookupError } = await supabase
      .from('participants')
      .select('id, first_name, last_name, email')
      .eq('email', inviteForm.email)
      .maybeSingle();

    if (lookupError || !participant) {
      setInviteError('No existing account found with that email. They need to create a participant account first.');
      setInviting(false);
      return;
    }

    const { error: insertError } = await supabase.from('admins').insert([
      {
        id: participant.id,
        first_name: participant.first_name,
        last_name: participant.last_name,
        email: participant.email,
        role: inviteForm.role,
        status: 'pending',
      },
    ]);

    if (insertError) {
      setInviteError(insertError.message);
    } else {
      setInviteForm({ email: '', role: 'coordinator' });
      fetchAdmins();
    }
    setInviting(false);
  };

  const handleActivate = async (id: string) => {
    const { error } = await supabase.from('admins').update({ status: 'active' }).eq('id', id);
    if (!error) fetchAdmins();
  };

  const handleRemove = async (id: string) => {
    const confirmed = await confirm({
      title: 'Remove administrator?',
      message: 'They will lose admin access immediately.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (!error) fetchAdmins();
  };

  if (loading) return <PageLoader label="Loading account..." />;

  return (
    <div className={styles.page}>
      <div>
        <h1>Admin Account</h1>
        <p className={styles.subtitle}>Manage your profile, team members, and account preferences.</p>
      </div>

      <div className={styles.layout}>
        <Card>
          <CardContent className={styles.profileCard}>
            <Avatar user={user} name={displayName} size={84} className={styles.profileAvatar} />
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileRole}>{displayRole} · KNUST E-Learning Portal</div>

            <div className={styles.infoRow}>
              <Mail size={16} /> {displayEmail}
            </div>
            <div className={styles.infoRow}>
              <ShieldCheck size={16} /> {displayRole}
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
              <span style={{ fontSize: '0.8125rem', color: 'var(--secondary-gray)' }}>
                Invite an existing participant account as an administrator.
              </span>
            </div>

            <form onSubmit={handleInvite} className={styles.addAdminForm}>
              <div className={styles.addAdminField}>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="colleague@knust.edu.gh"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <select
                className={styles.roleSelect}
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as AdminRow['role'] })}
                aria-label="Role for new administrator"
              >
                <option value="coordinator">Coordinator</option>
                <option value="super_admin">Super Administrator</option>
              </select>
              <Button type="submit" disabled={inviting}>
                <UserPlus size={16} style={{ marginRight: '0.5rem' }} />
                {inviting ? 'Adding...' : 'Add New Admin'}
              </Button>
              {inviteError && (
                <div style={{ width: '100%', color: 'var(--primary-red)', fontSize: '0.8125rem' }}>{inviteError}</div>
              )}
            </form>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Administrator</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 && (
                    <tr><td colSpan={4} className={styles.emptyState}>No administrators yet.</td></tr>
                  )}
                  {admins.map((a) => {
                    const adminName = a.first_name ? `${a.first_name} ${a.last_name || ''}` : 'Unknown';
                    return (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.adminRow}>
                          <Avatar user={{ id: a.id }} name={adminName} size={32} />
                          <div>
                            <div className={styles.adminName}>
                              {adminName}
                              {a.id === user?.id && ' (you)'}
                            </div>
                            <div className={styles.adminEmail}>{a.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge variant={a.role === 'super_admin' ? 'primary' : 'info'}>{roleLabel[a.role]}</Badge></td>
                      <td><Badge variant={a.status === 'active' ? 'success' : 'warning'}>{a.status}</Badge></td>
                      <td>
                        <div className={styles.actionCell}>
                          {a.status === 'pending' && (
                            <button className={styles.iconButton} onClick={() => handleActivate(a.id)} aria-label="Activate admin">
                              <Check size={15} />
                            </button>
                          )}
                          {a.id !== user?.id && (
                            <button
                              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                              onClick={() => handleRemove(a.id)}
                              aria-label="Remove admin"
                            >
                              <UserMinus size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
