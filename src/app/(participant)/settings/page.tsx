'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Toggle } from '@/components/ui/toggle/Toggle';
import { downloadIcsFile, buildEventDescription, type CalendarEvent } from '@/lib/calendar';
import { Pencil, X, Download, CalendarCheck } from 'lucide-react';
import styles from './Settings.module.css';

type UpcomingBooking = {
  id: string;
  workshops: {
    title: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    facilitator: string | null;
    category: string | null;
  } | null;
};

export default function SettingsPage() {
  const { user } = useAuth();

  // Local override so the toggle feels instant; falls back to the saved
  // preference from user_metadata until the user actually flips it.
  const [emailRemindersOverride, setEmailRemindersOverride] = useState<boolean | null>(null);
  const emailReminders = emailRemindersOverride ?? (user?.user_metadata?.email_reminders ?? true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);

  useEffect(() => {
    async function fetchBookings() {
      if (!user) return;
      const { data } = await supabase
        .from('bookings')
        .select('id, workshops (title, description, date, start_time, end_time, location, facilitator, category)')
        .eq('participant_id', user.id);
      setBookings((data as unknown as UpcomingBooking[]) || []);
    }
    fetchBookings();
  }, [user]);

  const handleTogglePreference = async (checked: boolean) => {
    setEmailRemindersOverride(checked);
    setSavingPreferences(true);
    await supabase.auth.updateUser({ data: { email_reminders: checked } });
    setSavingPreferences(false);
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordForm({ password: '', confirmPassword: '' });
    setPasswordError('');
  };

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
      setIsChangingPassword(false);
    }
    setPasswordSaving(false);
  };

  const bookingsWithWorkshop = bookings.filter((b) => b.workshops);

  const handleExportAll = () => {
    const events: CalendarEvent[] = bookingsWithWorkshop.map((b) => ({
      uid: b.id,
      title: b.workshops!.title,
      location: b.workshops!.location || undefined,
      description: buildEventDescription(b.workshops!),
      date: b.workshops!.date,
      startTime: b.workshops!.start_time,
      endTime: b.workshops!.end_time,
    }));
    downloadIcsFile('my-knust-elearning-schedule', events);
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p className={styles.subtitle}>Manage your password, notifications, and calendar sync.</p>
      </div>

      <div className={styles.sections}>
        <Card>
          <CardContent>
            <h2 className={styles.sectionTitle}>Notification Preferences</h2>
            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>Email reminders</div>
                <div className={styles.toggleDescription}>
                  Get an email before workshops you&apos;ve booked start.
                </div>
              </div>
              <Toggle checked={emailReminders} onChange={handleTogglePreference} label="Toggle email reminders" />
            </div>
            {savingPreferences && <p className={styles.savingHint}>Saving...</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>
                  <CalendarCheck size={16} style={{ marginRight: '0.5rem', verticalAlign: '-3px' }} />
                  Calendar Sync
                </div>
                <div className={styles.toggleDescription}>
                  {bookingsWithWorkshop.length > 0
                    ? `Export ${bookingsWithWorkshop.length} booked ${bookingsWithWorkshop.length === 1 ? 'session' : 'sessions'} to Google, Apple, or Outlook calendar.`
                    : "You haven't booked any workshops yet — nothing to export."}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExportAll}
                disabled={bookingsWithWorkshop.length === 0}
              >
                <Download size={16} style={{ marginRight: '0.5rem' }} /> Export (.ics)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className={styles.nameSectionHeader}>
              <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Change Password</h2>
              {!isChangingPassword && (
                <button type="button" className={styles.editButton} onClick={() => setIsChangingPassword(true)}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            {passwordSuccess && !isChangingPassword && <div className={styles.successText}>Password updated successfully.</div>}

            {isChangingPassword ? (
              <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                {passwordError && <div className={styles.errorText}>{passwordError}</div>}
                <Input
                  label="New password"
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  required
                  minLength={6}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <div className={styles.editActions}>
                  <Button type="button" variant="outline" onClick={handleCancelPasswordChange} disabled={passwordSaving}>
                    <X size={16} style={{ marginRight: '0.375rem' }} /> Cancel
                  </Button>
                  <Button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? 'Saving...' : 'Save Password'}
                  </Button>
                </div>
              </form>
            ) : (
              <p className={styles.toggleDescription}>••••••••••••</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
