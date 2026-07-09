/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import styles from './Countdown.module.css';

interface CountdownProps {
  targetDate: string; // ISO string like "2026-07-16T00:00:00Z"
}

export function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className={styles.countdownWrapper}>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{String(timeLeft.days).padStart(2, '0')}</span>
        <span className={styles.label}>Days</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className={styles.label}>Hours</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className={styles.label}>Minutes</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className={styles.label}>Seconds</span>
      </div>
    </div>
  );
}
