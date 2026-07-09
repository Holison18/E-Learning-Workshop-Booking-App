'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import styles from './WorkshopFilterList.module.css';
import { WorkshopThumbnail } from '@/components/ui/workshop-thumbnail/WorkshopThumbnail';
import { Badge } from '@/components/ui/badge/Badge';

type Workshop = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  image_url?: string;
  date: string;
  start_time: string;
  audience?: string;
  capacity: number;
  seats_booked: number;
};

interface WorkshopFilterListProps {
  initialWorkshops: Workshop[];
}

export function WorkshopFilterList({ initialWorkshops }: WorkshopFilterListProps) {
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract unique dates and sort them
  const uniqueDates = useMemo(() => {
    const dates = new Set(initialWorkshops.map(ws => ws.date));
    return Array.from(dates).sort();
  }, [initialWorkshops]);

  // Filter workshops based on selection
  const filteredWorkshops = useMemo(() => {
    if (selectedDate === 'all') return initialWorkshops;
    return initialWorkshops.filter(ws => ws.date === selectedDate);
  }, [initialWorkshops, selectedDate]);

  // Format date for display in tabs
  const formatDateTab = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div>
      {/* Date Filter Tabs */}
      {uniqueDates.length > 0 && (
        <div className={styles.filterContainer}>
          <button
            onClick={() => { setSelectedDate('all'); setExpandedId(null); }}
            className={`${styles.filterTab} ${selectedDate === 'all' ? styles.filterTabActive : ''}`}
          >
            All Days
          </button>
          
          {uniqueDates.map(date => (
            <button
              key={date}
              onClick={() => { setSelectedDate(date); setExpandedId(null); }}
              className={`${styles.filterTab} ${selectedDate === date ? styles.filterTabActive : ''}`}
            >
              {formatDateTab(date)}
            </button>
          ))}
        </div>
      )}

      {/* Filtered Grid */}
      {filteredWorkshops.length === 0 ? (
        <div className={styles.noResults}>
          No workshops scheduled for this day.
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredWorkshops.map((ws, index) => {
            const seatsBooked = ws.seats_booked || 0;
            const isFull = seatsBooked >= ws.capacity;
            const seatsLeft = ws.capacity - seatsBooked;
            const isExpanded = expandedId === ws.id;
            
            return (
              <div 
                key={`${ws.id}-${selectedDate}`} // Key includes selectedDate to re-trigger animation on filter
                className={`${styles.workshopCard} ${isExpanded ? styles.expandedCard : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Link href={`/workshops/${ws.id}`} style={{ textDecoration: 'none' }}>
                  <WorkshopThumbnail 
                    imageUrl={ws.image_url} 
                    title={ws.title} 
                    category={ws.category} 
                    className={styles.workshopImage} 
                  />
                </Link>
                <div className={styles.workshopContent}>
                  <div className={styles.workshopCategory}>{(ws.category || 'General').toUpperCase()}</div>
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
                    {ws.audience && (
                      <div className={styles.metaItem}>
                        <User size={14} />
                        {ws.audience}
                      </div>
                    )}
                  </div>
                  
                  {ws.description && (
                    <div className={styles.expandSection}>
                      <button onClick={(e) => toggleExpand(ws.id, e)} className={styles.expandToggle}>
                        {isExpanded ? (
                          <>Read Less <ChevronUp size={16} /></>
                        ) : (
                          <>Read More <ChevronDown size={16} /></>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div 
                          className={styles.workshopDescriptionRich}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ws.description) }}
                        />
                      )}
                    </div>
                  )}
                  
                  <div className={styles.workshopFooter}>
                    {isFull ? (
                      <Badge variant="danger">Full</Badge>
                    ) : (
                      <Badge variant="success">{seatsLeft} seats left</Badge>
                    )}
                    <Link href={`/workshops/${ws.id}`} className={styles.bookLink}>
                      Book Now <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
