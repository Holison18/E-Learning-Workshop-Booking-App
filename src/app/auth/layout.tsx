import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './AuthLayout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.formPane}>
        <div className={styles.formPaneInner}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/images/logo/knust-elearning-logo.png"
              alt="KNUST E-Learning Centre"
              width={1161}
              height={447}
              className={styles.logoImage}
              priority
            />
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
