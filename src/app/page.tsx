import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';
import styles from './Landing.module.css';
import { WorkshopThumbnail } from '@/components/ui/workshop-thumbnail/WorkshopThumbnail';
import { Badge } from '@/components/ui/badge/Badge';
import { Countdown } from '@/components/ui/countdown/Countdown';
import { WorkshopFilterList } from '@/components/ui/workshop-filter/WorkshopFilterList';
import { HeroWorkshopCarousel } from '@/components/ui/hero-carousel/HeroWorkshopCarousel';

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function LandingPage() {
  // Fetch published workshops
  const { data: workshops } = await supabase
    .from('workshops')
    .select('*')
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/images/logo/knust-elearning-logo.png" alt="KNUST E-Learning" width={200} height={50} style={{ objectFit: 'contain' }} />
        </div>
        
        <div className={styles.navActions}>
          <Link href="/auth/login" className={`${styles.btn} ${styles.btnPrimary}`}>
            Register Events
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBgOverlay}></div>
        <div className={styles.heroVerticalText}>KNUST 2026</div>
        
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>Welcome to the KNUST E-Learning Week | 13-17 July 2026</span>
          <h1 className={styles.heroTitle} style={{ textTransform: 'none' }}>
            Workshops and tutorials designed for <span className={styles.highlightText}>students</span>, <span className={styles.highlightText}>graduates</span>, <span className={styles.highlightText}>pre-tertiary educators</span>, and administrators.
          </h1>
          <p className={styles.heroTheme}>
            View the schedule and book events. <br/><br/>
            Theme: Harnessing AI and Emerging Digital Technologies to Advance Inclusive, Equitable, and Ethical Learning Ecosystems.
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <Link href="/auth/login" className={`${styles.btn} ${styles.btnPrimary}`}>
              Register Events
            </Link>
          </div>
          
          <Countdown targetDate="2026-07-13T08:00:00Z" />
        </div>

        <HeroWorkshopCarousel workshops={workshops || []} />
      </section>

      {/* Conference Schedule */}
      <section className={styles.workshopsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Events and Workshops</h2>
          <p className={styles.sectionSubtitle}>
            Explore our hands-on sessions led by industry experts. Select a day below to view the workshops for that specific date.
          </p>
        </div>

        <WorkshopFilterList initialWorkshops={workshops || []} />
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Image 
            src="/images/logo/kec-mark-white.png" 
            alt="KNUST Logo" 
            width={120} 
            height={60} 
            className={styles.footerLogo}
          />
          <div className={styles.footerCopyright}>
            &copy; {new Date().getFullYear()} Kwame Nkrumah University of Science and Technology (KNUST) E-Learning Centre. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
