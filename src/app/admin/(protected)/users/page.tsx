'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, UserCheck, Mail, Calendar, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import styles from './AdminUsers.module.css';

type AuthUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchUsers() {
    const res = await fetch('/api/admin/user');
    const json = await res.json();
    setUsers(json.data?.users || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user? This will also remove their bookings and profile.')) return;
    const res = await fetch('/api/admin/user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId }),
    });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Delete failed'));
    }
  };

  if (loading) return <div className={styles.emptyState}>Loading users...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>User Management</h1>
          <p className={styles.subtitle}>
            View and manage all registered users on the platform.
          </p>
        </div>
        <div className={styles.totalBadge}>
          <UserCheck size={16} />
          {users.length} Total Users
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchField}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = users.filter((u) => {
                    const q = searchQuery.toLowerCase();
                    const firstName = u.user_metadata?.first_name || '';
                    const lastName = u.user_metadata?.last_name || '';
                    const name = [firstName, lastName].filter(Boolean).join(' ').toLowerCase();
                    return name.includes(q) || u.email.toLowerCase().includes(q);
                  });
                  if (users.length === 0) return <tr><td colSpan={5} className={styles.emptyState}>No users found.</td></tr>;
                  if (filtered.length === 0) return <tr><td colSpan={5} className={styles.emptyState}>No users match your search.</td></tr>;
                  return filtered.map((u) => {
                  const firstName = u.user_metadata?.first_name || '';
                  const lastName = u.user_metadata?.last_name || '';
                  const name = [firstName, lastName].filter(Boolean).join(' ') || u.email?.split('@')[0] || 'Unknown';
                  const initials = (firstName?.[0] || u.email?.[0] || '?').toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userRow}>
                          <span className={styles.userAvatar}>{initials}</span>
                          <span className={styles.userName}>{name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.emailCell}>
                          <Mail size={14} />
                          {u.email}
                        </span>
                      </td>
                      <td>
                        <span className={styles.dateCell}>
                          <Calendar size={14} />
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td><Badge variant="success">Active</Badge></td>
                      <td>
                        <button
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => handleDelete(u.id)}
                          aria-label="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })})()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
