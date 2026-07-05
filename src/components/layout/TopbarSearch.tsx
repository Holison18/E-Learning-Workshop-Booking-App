'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import styles from './DashboardLayout.module.css';

export function TopbarSearch({ admin }: { admin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetPath = admin ? '/admin/workshops' : '/dashboard';
  const isOnTarget = pathname === targetPath;

  const [value, setValue] = useState(isOnTarget ? searchParams.get('q') || '' : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `${targetPath}?q=${encodeURIComponent(trimmed)}` : targetPath);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchBar} role="search">
      <Search size={18} className={styles.actionIcon} aria-hidden="true" />
      <input
        type="text"
        placeholder="Search workshops, speakers, topics..."
        className={styles.searchInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search workshops, speakers, topics"
      />
    </form>
  );
}
