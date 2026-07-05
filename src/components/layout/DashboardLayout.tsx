'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './DashboardLayout.module.css';
import { 
  LayoutDashboard, 
  GraduationCap, 
  CalendarDays, 
  Calendar, 
  Bell, 
  Users, 
  BookOpen, 
  User as UserIcon, 
  Settings, 
  LogOut,
} from 'lucide-react';

export default function DashboardLayout({ children, admin = false }: { children: React.ReactNode, admin?: boolean }) {
  const { user, loading, isAdmin, adminInfo } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (admin) {
      if (!loading && !adminInfo && !(user && isAdmin)) {
        router.push('/admin/login');
      }
    } else {
      if (!loading && !user) {
        router.push('/auth/login');
      }
    }
  }, [loading, user, isAdmin, adminInfo, admin, router]);

  const handleLogout = async () => {
    if (admin) {
      await fetch('/api/admin/logout', { method: 'POST' });
    }
    await supabase.auth.signOut();
    router.push(admin ? '/admin/login' : '/auth/login');
  };

  const adminAuthed = admin ? !!(adminInfo || (user && isAdmin)) : true;

  if (loading) {
    return <div className={styles.layout} style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  if (admin && !adminAuthed) {
    return null;
  }

  if (!admin && !user) {
    return null;
  }

  const participantLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/workshops', label: 'Workshops', icon: <GraduationCap size={18} /> },
    { href: '/bookings', label: 'My Bookings', icon: <CalendarDays size={18} /> },
    { href: '/schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  ];

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/workshops', label: 'Workshops', icon: <GraduationCap size={18} /> },
    { href: '/admin/bookings', label: 'Bookings', icon: <BookOpen size={18} /> },
    { href: '/admin/users', label: 'Users', icon: <Users size={18} /> },
    { href: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const links = admin ? adminLinks : participantLinks;

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || adminInfo?.email?.split('@')[0] || 'Admin';
  const role = admin ? 'Administrator' : 'Student';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href={admin ? "/admin/dashboard" : "/dashboard"} className={styles.logo}>
          <span className={styles.logoTitle}>KNUST E-Learning</span>
          <span className={styles.logoSubtitle}>Workshop Portal</span>
        </Link>

        <nav className={styles.navGroup}>
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`${styles.navLink} ${(pathname === link.href || pathname.startsWith(link.href + '/')) ? styles.active : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.navLabel}>{admin ? 'ACCOUNT' : 'USER ACCOUNT'}</div>
        <nav className={styles.navGroup}>
          {!admin && (
            <Link href="/notifications" className={styles.navLink}>
              <Bell size={18} /> Notifications
            </Link>
          )}
          <Link href={admin ? '/admin/account' : '/account'} className={styles.navLink}>
            <UserIcon size={18} /> My Account
          </Link>
          {!admin && (
            <Link href="/settings" className={styles.navLink}>
              <Settings size={18} /> Settings
            </Link>
          )}
          <button onClick={handleLogout} className={styles.navLink} style={{ marginTop: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </nav>

        <div className={styles.profileWidget}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{initial}</div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{firstName}</span>
              <span className={styles.profileRole}>{role}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.topbarActions}>
            <Bell size={20} className={styles.actionIcon} />
            <div className={styles.topbarProfile}>
              <div className={styles.avatar} style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{initial}</div>
              <span className={styles.topbarProfileName}>{firstName}</span>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
