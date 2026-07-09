import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, ArrowRight, Search } from 'lucide-react';
import styles from './Landing.module.css';
import { WorkshopThumbnail } from '@/components/ui/workshop-thumbnail/WorkshopThumbnail';
import { Badge } from '@/components/ui/badge/Badge';
import { Countdown } from '@/components/ui/countdown/Countdown';

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function LandingPage() {
  // Fetch published workshops
  const { data: workshops } = await supabase
    .from('workshops')
    .select('*')
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(6);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/images/logo/knust-elearning-logo.png" alt="KNUST E-Learning" width={200} height={50} style={{ objectFit: 'contain' }} />
        </div>
        
        <div className={styles.navActions}>
          <Link href="/auth/login" className={`${styles.btn} ${styles.btnPrimary}`}>
            Register Workshops
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBgOverlay}></div>
        <div className={styles.heroVerticalText}>KNUST 2026</div>
        
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>Welcome to the KNUST E-Learning Conference 2026 | 16-17 July 2026</span>
          <h1 className={styles.heroTitle}>
            A LEADING EVENT FOR <span className={styles.highlightText}>EDUCATORS</span>, <span className={styles.highlightText}>POLICYMAKERS</span>, <span className={styles.highlightText}>INDUSTRY LEADERS</span> & EXPERTS IN EDUCATION
          </h1>
          <p className={styles.heroTheme}>
            Theme: Harnessing AI and Emerging Digital Technologies to Advance Inclusive, Equitable, and Ethical Learning Ecosystems.
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <Link href="/auth/login" className={`${styles.btn} ${styles.btnPrimary}`}>
              Register Workshops
            </Link>
          </div>
          
          <Countdown targetDate="2026-07-16T08:00:00Z" />
        </div>

        <div className={styles.masonryGrid}>
          <div className={styles.masonryItem1}>
            <Image 
              src="/images/landing/robot_ai.png" 
              alt="AI Concept" 
              width={400} 
              height={600} 
              className={styles.masonryImg}
            />
          </div>
          <div className={styles.masonryItem2}>
            <Image 
              src="/images/landing/vr_student.png" 
              alt="Student in VR" 
              width={400} 
              height={300} 
              className={styles.masonryImg}
            />
          </div>
          <div className={styles.masonryItem3}>
            <Image 
              src="/images/landing/student_robot.png" 
              alt="Student with Robot" 
              width={400} 
              height={300} 
              className={styles.masonryImg}
            />
          </div>
        </div>
      </section>

      {/* Featured Workshops */}
      <section className={styles.workshopsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Workshops</h2>
          <p className={styles.sectionSubtitle}>
            Explore our curated selection of hands-on sessions led by industry experts and thought leaders.
          </p>
        </div>

        <div className={styles.grid}>
          {workshops && workshops.map((ws, index) => {
            const seatsBooked = ws.seats_booked || 0;
            const isFull = seatsBooked >= ws.capacity;
            const seatsLeft = ws.capacity - seatsBooked;
            
            return (
              <div 
                key={ws.id} 
                className={styles.workshopCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <WorkshopThumbnail 
                  imageUrl={ws.image_url} 
                  title={ws.title} 
                  category={ws.category} 
                  className={styles.workshopImage} 
                />
                <div className={styles.workshopContent}>
                  <div className={styles.workshopCategory}>{(ws.category || 'General').toUpperCase()}</div>
                  <h3 className={styles.workshopTitle}>{ws.title}</h3>
                  
                  <div className={styles.workshopMeta}>
                    <div className={styles.metaItem}>
                      <Calendar size={14} />
                      {new Date(ws.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={styles.metaItem}>
                      <Clock size={14} />
                      {ws.start_time.slice(0, 5)}
                    </div>
                    {ws.facilitator && (
                      <div className={styles.metaItem}>
                        <User size={14} />
                        {ws.facilitator}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.workshopFooter}>
                    {isFull ? (
                      <Badge variant="danger">Full</Badge>
                    ) : (
                      <Badge variant="success">{seatsLeft} seats left</Badge>
                    )}
                    <Link href="/auth/login" className={styles.bookLink}>
                      Book Now <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
