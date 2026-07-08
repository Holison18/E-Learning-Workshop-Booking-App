'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import styles from './HeroWorkshopCarousel.module.css';
import { WorkshopThumbnail } from '@/components/ui/workshop-thumbnail/WorkshopThumbnail';

type Workshop = {
  id: string;
  title: string;
  category?: string;
  image_url?: string;
  date: string;
  start_time: string;
  capacity: number;
  seats_booked: number;
};

interface HeroWorkshopCarouselProps {
  workshops: Workshop[];
}

export function HeroWorkshopCarousel({ workshops }: HeroWorkshopCarouselProps) {
  // Get top 3 most booked workshops
  const topWorkshops = useMemo(() => {
    return [...workshops]
      .sort((a, b) => (b.seats_booked || 0) - (a.seats_booked || 0))
      .slice(0, 3);
  }, [workshops]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingOut, setAnimatingOut] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (topWorkshops.length <= 1 || !isClient) return;

    const interval = setInterval(() => {
      // Trigger the exit animation on the current front card
      setAnimatingOut(currentIndex);
      
      // After 350ms (half the CSS transition time), change the actual index
      // so it pops to the back and the next one comes forward.
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % topWorkshops.length);
        setAnimatingOut(null);
      }, 350);
      
    }, 5000); // Shuffle every 5 seconds

    return () => clearInterval(interval);
  }, [currentIndex, topWorkshops.length, isClient]);

  if (topWorkshops.length === 0) {
    return null;
  }

  // Prevent hydration mismatch on dates by only rendering fully on client
  if (!isClient) {
    return <div className={styles.carouselContainer}></div>;
  }

  return (
    <div className={styles.carouselContainer}>
      {topWorkshops.map((ws, index) => {
        // Calculate the position of this card relative to the current index
        let position = (index - currentIndex + topWorkshops.length) % topWorkshops.length;
        
        // Determine the CSS class based on position
        let cardClass = styles.cardBack;
        
        if (animatingOut === index) {
          cardClass = styles.cardExit;
        } else if (position === 0) {
          cardClass = styles.cardFront;
        } else if (position === 1) {
          cardClass = styles.cardMiddle;
        } else if (position === 2) {
          cardClass = styles.cardBack;
        }

        return (
          <div key={ws.id} className={`${styles.carouselCard} ${cardClass}`}>
            <Link href={`/workshops/${ws.id}`} style={{ textDecoration: 'none' }}>
              <WorkshopThumbnail 
                imageUrl={ws.image_url} 
                title={ws.title} 
                category={ws.category} 
                className={styles.workshopImage} 
              />
            </Link>
            <div className={styles.workshopContent}>
              <div className={styles.workshopCategory}>
                {(ws.category || 'Featured').toUpperCase()}
              </div>
              <Link href={`/workshops/${ws.id}`} style={{ textDecoration: 'none' }}>
                <h3 className={styles.workshopTitle}>{ws.title}</h3>
              </Link>
              
              <div className={styles.workshopMeta}>
                <div className={styles.metaItem}>
                  <Calendar size={14} />
                  {new Date(ws.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className={styles.metaItem}>
                  <Clock size={14} />
                  {ws.start_time.slice(0, 5)}
                </div>
              </div>
              
              <Link href="/auth/login" className={styles.bookLink}>
                Book Now <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
