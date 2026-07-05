'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeftRight
} from 'lucide-react';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { getFirstName } from '@/lib/user';
import { TopbarSearch } from './TopbarSearch';
import { NotificationBell } from './NotificationBell';
import { Avatar } from '@/components/ui/avatar/Avatar';

export default function DashboardLayout({ children, admin = false }: { children: React.ReactNode, admin?: boolean }) {
  const { user, loading, isAdmin, adminRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (!loading && user && admin && !isAdmin) {
      router.push('/dashboard');
    }
    
    // Route guard for Coordinators
    if (!loading && user && admin && adminRole === 'coordinator') {
      const allowedPaths = ['/admin/dashboard', '/admin/account'];
      if (!allowedPaths.includes(pathname)) {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, admin, isAdmin, adminRole, pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading || !user || (admin && !isAdmin)) {
    return <PageLoader fullScreen />;
  }

  const participantLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/bookings', label: 'My Bookings', icon: <CalendarDays size={18} /> },
    { href: '/schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  ];

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ...(adminRole === 'super_admin' ? [
      { href: '/admin/workshops', label: 'Workshops', icon: <GraduationCap size={18} /> },
      { href: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    ] : []),
  ];

  const links = admin ? adminLinks : participantLinks;

  const firstName = getFirstName(user);
  const role = admin ? 'Administrator' : 'Student';

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      <Link href={admin ? "/admin/dashboard" : "/dashboard"} className={styles.logo} onClick={onNavigate}>
        <Image
          src="/images/logo/knust-elearning-logo.png"
          alt="KNUST E-Learning Centre"
          width={1161}
          height={447}
          className={styles.logoImage}
          priority
        />
      </Link>

      <nav className={styles.navGroup}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            onClick={onNavigate}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      {isAdmin && adminRole === 'super_admin' && (
        <Link
          href={admin ? '/dashboard' : '/admin/dashboard'}
          className={styles.viewSwitch}
          onClick={onNavigate}
        >
          <ArrowLeftRight size={16} />
          {admin ? 'Switch to Member View' : 'Switch to Admin View'}
        </Link>
      )}

      <div className={styles.navLabel}>{admin ? 'ACCOUNT' : 'USER ACCOUNT'}</div>
      <nav className={styles.navGroup}>
        {!admin && (
          <Link href="/notifications" className={`${styles.navLink} ${pathname === '/notifications' ? styles.active : ''}`} onClick={onNavigate}>
            <Bell size={18} /> Notifications
          </Link>
        )}
        <Link href={admin ? '/admin/account' : '/account'} className={`${styles.navLink} ${pathname === (admin ? '/admin/account' : '/account') ? styles.active : ''}`} onClick={onNavigate}>
          <UserIcon size={18} /> My Account
        </Link>
        {!admin && (
          <Link href="/settings" className={`${styles.navLink} ${pathname === '/settings' ? styles.active : ''}`} onClick={onNavigate}>
            <Settings size={18} /> Settings
          </Link>
        )}
        <button onClick={handleLogout} className={styles.navLink} style={{ marginTop: '0.5rem' }}>
          <LogOut size={18} /> Logout
        </button>
      </nav>

      <div className={styles.profileWidget}>
        <div className={styles.profileCard}>
          <Avatar user={user} name={firstName} size={36} />
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{firstName}</span>
            <span className={styles.profileRole}>{role}</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.layout}>
      {/* Sidebar (desktop) */}
      <aside className={styles.sidebar}>{renderSidebarContent()}</aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside className={`${styles.mobileDrawer} ${mobileNavOpen ? styles.mobileDrawerOpen : ''}`}>
        <button
          className={styles.mobileDrawerClose}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
        {renderSidebarContent(() => setMobileNavOpen(false))}
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainArea}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <Suspense fallback={<div className={styles.searchBar} />}>
            {(!admin || adminRole === 'super_admin') && <TopbarSearch admin={admin} />}
          </Suspense>
          <div className={styles.topbarActions}>
            {(!admin || adminRole === 'super_admin') && <NotificationBell user={user} admin={admin} />}
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
