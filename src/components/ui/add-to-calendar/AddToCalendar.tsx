'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, ExternalLink, Download } from 'lucide-react';
import { buildGoogleCalendarUrl, downloadIcsFile, type CalendarEvent } from '@/lib/calendar';
import styles from './AddToCalendar.module.css';

// Renders the menu into a portal at a fixed, viewport-relative position instead
// of a normal absolutely-positioned child - this component gets used inside
// Card, which clips overflow for its rounded corners, so an in-flow dropdown
// would get silently cropped by that clip.
export function AddToCalendar({ event, label = 'Add to Calendar' }: { event: CalendarEvent; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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
        className={styles.trigger}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CalendarPlus size={14} /> {label}
      </button>
      {open && position && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={{ position: 'fixed', top: position.top, right: position.right }}
          >
            <a
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <ExternalLink size={14} /> Google Calendar
            </a>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                downloadIcsFile(event.title, [event]);
                setOpen(false);
              }}
            >
              <Download size={14} /> Apple / Outlook (.ics)
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
