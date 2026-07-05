'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Bell, BellOff } from 'lucide-react';
import { countUnreadNotifications, fetchRecentNotifications, markNotificationsSeen, type NotificationItem } from '@/lib/notifications';
import styles from './NotificationBell.module.css';
import bellStyles from './DashboardLayout.module.css';

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ user, admin }: { user: User; admin: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewAllHref = admin ? '/admin/notifications' : '/notifications';

  useEffect(() => {
    let cancelled = false;
    countUnreadNotifications(user, admin).then((count) => {
      if (!cancelled) setUnreadCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [user, admin]);

  const handleToggle = () => {
    if (!open) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
      if (items === null) {
        fetchRecentNotifications(user, admin).then(setItems);
      }
      markNotificationsSeen(user);
      setUnreadCount(0);
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={bellStyles.notificationBell}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell size={20} className={bellStyles.actionIcon} aria-hidden="true" />
        {unreadCount > 0 && <span className={bellStyles.notificationDot} aria-hidden="true" />}
      </button>
      {open && position && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.panel}
            role="menu"
            style={{ position: 'fixed', top: position.top, right: position.right }}
          >
            <div className={styles.header}>Notifications</div>
            <div className={styles.list}>
              {items === null ? (
                <div className={styles.loading}>Loading...</div>
              ) : items.length === 0 ? (
                <div className={styles.empty}>
                  <BellOff size={24} aria-hidden="true" />
                  <span>You&apos;re all caught up.</span>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemTime}>{timeAgo(item.sent_at)}</span>
                    </div>
                    <p className={styles.itemMessage}>{item.message}</p>
                  </div>
                ))
              )}
            </div>
            <Link href={viewAllHref} className={styles.viewAll} onClick={() => setOpen(false)}>
              View all notifications →
            </Link>
          </div>,
          document.body
        )}
    </>
  );
}
