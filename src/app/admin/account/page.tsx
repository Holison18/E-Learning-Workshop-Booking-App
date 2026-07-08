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
  const [generateForm, setGenerateForm] = useState({ firstName: '', lastName: '', email: '', role: 'coordinator' as AdminRow['role'], password: '' });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string; role: string } | null>(null);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateError('');
    setGenerating(true);
    setGeneratedCredentials(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setGenerateError('Authentication error. Please log in again.');
      setGenerating(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(generateForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate credentials');
      }

      setGeneratedCredentials({
        email: generateForm.email,
        password: generateForm.password,
        role: generateForm.role
      });
      
      setGenerateForm({ firstName: '', lastName: '', email: '', role: 'coordinator', password: '' });
      fetchAdmins();
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateCoordinatorCode = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPass = Math.random().toString(36).slice(-8);
    setGenerateForm({
      firstName: 'Event',
      lastName: `Coordinator ${randomId}`,
      email: `coordinator-${randomId}@knust.edu.gh`,
      role: 'coordinator',
      password: randomPass
    });
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

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert('Authentication error. Please log in again.');
        return;
      }

      const response = await fetch('/api/admin/delete-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminId: id })
      });

      if (response.ok) {
        fetchAdmins();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to remove administrator');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove administrator');
    }
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

        {currentAdmin?.role === 'super_admin' && (
          <Card>
            <CardContent>
              <div className={styles.teamHeader}>
                <h2 className={styles.teamTitle}>Team Management</h2>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary-gray)' }}>
                  Generate credentials for new administrators or coordinators.
                </span>
              </div>

              {generatedCredentials && (
                <div style={{ backgroundColor: 'var(--success-green)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Credentials Generated Successfully!</h3>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', opacity: 0.9 }}>Please copy these credentials securely and share them with the {generatedCredentials.role === 'coordinator' ? 'coordinator' : 'administrator'}. They will use this to log in to the Admin Portal.</p>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                    <strong>Email:</strong> {generatedCredentials.email}<br />
                    <strong>Password:</strong> {generatedCredentials.password}
                  </div>
                </div>
              )}

              <form onSubmit={handleGenerate} className={styles.addAdminForm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <Input
                    label="First Name"
                    type="text"
                    placeholder="Kwame"
                    value={generateForm.firstName}
                    onChange={(e) => setGenerateForm({ ...generateForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Last Name"
                    type="text"
                    placeholder="Mensah"
                    value={generateForm.lastName}
                    onChange={(e) => setGenerateForm({ ...generateForm, lastName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="colleague@knust.edu.gh"
                    value={generateForm.email}
                    onChange={(e) => setGenerateForm({ ...generateForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Initial Password"
                    type="text"
                    placeholder="Enter or generate password"
                    value={generateForm.password}
                    onChange={(e) => setGenerateForm({ ...generateForm, password: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary-gray)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</div>
                  <select
                    className={styles.roleSelect}
                    value={generateForm.role}
                    onChange={(e) => setGenerateForm({ ...generateForm, role: e.target.value as AdminRow['role'] })}
                    aria-label="Role for new administrator"
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="coordinator">Coordinator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="button" variant="outline" onClick={generateCoordinatorCode} style={{ flex: 1, padding: '0 0.5rem' }}>
                    Auto-Fill Coordinator
                  </Button>
                  <Button type="submit" disabled={generating} style={{ flex: 1 }}>
                    <UserPlus size={16} style={{ marginRight: '0.5rem' }} />
                    {generating ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                {generateError && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--primary-red)', fontSize: '0.8125rem' }}>{generateError}</div>
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
        )}
      </div>
    </div>
  );
}
