import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  danger?: boolean;
}

export function ProgressBar({ value, max, label, danger }: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isFull = value >= max;

  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${danger || isFull ? styles.fillDanger : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={styles.label}>{label ?? `${value}/${max}`}</span>
    </div>
  );
}
