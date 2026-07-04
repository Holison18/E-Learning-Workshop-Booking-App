import React from 'react';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import styles from './AuthLayout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.formPane}>
        <div className={styles.formPaneInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>
              <Repeat size={20} />
            </span>
            <span className={styles.logoText}>SocialRepeat</span>
          </Link>

          <div className={styles.content}>{children}</div>

          <footer className={styles.footer}>
            <span>Terms and conditions</span>
            <span className={styles.dot}>•</span>
            <span>Privacy policy</span>
          </footer>
        </div>
      </div>

      <div className={styles.imagePane} aria-hidden="true" />
    </div>
  );
}
