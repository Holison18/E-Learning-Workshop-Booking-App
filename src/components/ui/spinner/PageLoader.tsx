import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './PageLoader.module.css';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export function PageLoader({ label = 'Loading...', fullScreen = false }: PageLoaderProps) {
  return (
    <div className={`${styles.wrapper} ${fullScreen ? styles.fullScreen : ''}`} role="status" aria-live="polite">
      <Loader2 className={`${styles.spinner} animate-spin`} size={32} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
