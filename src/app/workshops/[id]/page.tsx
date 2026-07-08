import React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './WorkshopDetails.module.css';

// Revalidate occasionally, but since it's an event page, we can cache it.
export const revalidate = 60;

// Dynamic Metadata Generation for SEO / Social Media sharing
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: workshop } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .single();

  if (!workshop) {
    return { title: 'Workshop Not Found' };
  }

  // Fallback description if the DB doesn't have one
  const description = workshop.description || `Join us for ${workshop.title} at KNUST E-Learning Week.`;
  const defaultImage = '/images/landing/robot_ai.png'; // fallback

  return {
    title: `${workshop.title} | KNUST E-Learning Week`,
    description: description,
    openGraph: {
      title: workshop.title,
      description: description,
      images: [
        {
          url: workshop.image_url || defaultImage,
          width: 1200,
          height: 630,
          alt: workshop.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: workshop.title,
      description: description,
      images: [workshop.image_url || defaultImage],
    },
  };
}

export default async function WorkshopDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: workshop } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .single();

  if (!workshop) {
    notFound();
  }

  const seatsBooked = workshop.seats_booked || 0;
  const isFull = seatsBooked >= workshop.capacity;
  const seatsLeft = workshop.capacity - seatsBooked;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image 
            src="/images/logo/knust-elearning-logo.png" 
            alt="KNUST E-Learning" 
            width={200} 
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Schedule
        </Link>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.grid}>
          
          {/* Left: Image Banner */}
          <div className={styles.imageSection}>
            <Image 
              src={workshop.image_url || '/images/landing/robot_ai.png'} 
              alt={workshop.title}
              fill
              className={styles.image}
              priority
            />
          </div>

          {/* Right: Details */}
          <div className={styles.detailsSection}>
            <div className={styles.category}>
              {(workshop.category || 'Featured').toUpperCase()}
            </div>
            
            <h1 className={styles.title}>{workshop.title}</h1>
            
            {/* Description fallback */}
            <p className={styles.description}>
              {workshop.description || "Join this highly anticipated workshop session. Learn from industry experts and get hands-on experience with the latest technologies and methodologies. Secure your spot now as seats are limited!"}
            </p>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Date</span>
                <span className={styles.metaValue}>
                  {new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Time</span>
                <span className={styles.metaValue}>
                  {workshop.start_time.slice(0, 5)} - {workshop.end_time.slice(0, 5)}
                </span>
              </div>

              {workshop.facilitator && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Facilitator</span>
                  <span className={styles.metaValue}>
                    {workshop.facilitator}
                  </span>
                </div>
              )}

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Capacity</span>
                <span className={styles.metaValue}>
                  {workshop.capacity} Participants
                </span>
              </div>
            </div>

            <div className={styles.actionSection}>
              {isFull ? (
                <>
                  <button disabled className={`${styles.btnPrimary} ${styles.btnDisabled}`}>
                    Session Full
                  </button>
                  <p className={`${styles.seatStatus} ${styles.seatsFull}`}>
                    0 seats available
                  </p>
                </>
              ) : (
                <>
                  {/* Link passes a redirect query param so login goes back to dashboard to actually book */}
                  <Link href={`/auth/login?redirect=/dashboard`} className={styles.btnPrimary}>
                    Book Now <ArrowRight size={20} />
                  </Link>
                  <p className={`${styles.seatStatus} ${styles.seatsAvailable}`}>
                    Only {seatsLeft} seats available
                  </p>
                </>
              )}
            </div>

          </div>
        </div>
      </main>

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
