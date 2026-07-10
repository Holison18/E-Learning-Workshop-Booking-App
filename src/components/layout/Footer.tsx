import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

// SVG Icons for social media since Lucide removed brand icons
const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const TwitterIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const LinkedinIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        {/* Brand Section */}
        <div className={styles.brandSection}>
          <Image 
            src="/images/logo/kec-mark-white.png" 
            alt="KNUST E-Learning Centre Logo" 
            width={160} 
            height={80} 
            className={styles.footerLogo}
          />
          <p>
            We are West Africa&apos;s premier hub for digital education, empowering industries and institutions with tailored training, workforce development, and digital transformation.
          </p>
          <div className={styles.socialRow}>
            <a href="#" className={styles.socialIcon} aria-label="Facebook">
              <FacebookIcon size={20} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="X (Twitter)">
              <TwitterIcon size={20} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="LinkedIn">
              <LinkedinIcon size={20} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="YouTube">
              <YoutubeIcon size={20} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="Instagram">
              <InstagramIcon size={20} />
            </a>
          </div>
        </div>

        {/* Useful Links */}
        <div>
          <h3 className={styles.sectionTitle}>Useful Links</h3>
          <ul className={styles.linksList}>
            <li>
              <Link href="#">Student Portal</Link>
            </li>
            <li>
              <Link href="#">Virtual Class Room</Link>
            </li>
            <li>
              <Link href="#">E-Learning Policy</Link>
            </li>
            <li>
              <Link href="#">Studio Booking</Link>
            </li>
            <li>
              <Link href="#">Courses</Link>
            </li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className={styles.sectionTitle}>Contact Us</h3>
          <ul className={styles.contactList}>
            <li className={styles.contactItem}>
              <Phone size={20} className={styles.contactIcon} />
              <div className={styles.contactPhones}>
                <span>0506978182</span>
                <span>0240161450</span>
              </div>
            </li>
            <li className={styles.contactItem}>
              <Mail size={20} className={styles.contactIcon} />
              <span>elearning@knust.edu.gh</span>
            </li>
            <li className={styles.contactItem}>
              <Clock size={20} className={styles.contactIcon} />
              <span>Monday - Friday at 08am-5pm</span>
            </li>
            <li className={styles.contactItem}>
              <MapPin size={20} className={styles.contactIcon} />
              <span>KNUST E-Learning Centre Directorate, CCB Auditorium</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; Copyright {currentYear} - Developed by University Information Technology Services-UITS.</p>
        <p>All Rights Reserved.</p>
      </div>
    </footer>
  );
}
