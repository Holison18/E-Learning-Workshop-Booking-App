import React from 'react';
import { Cpu, FlaskConical, ShieldCheck, PenTool, BarChart3, BookOpen } from 'lucide-react';
import styles from './WorkshopThumbnail.module.css';

const CATEGORY_STYLES: Record<string, { gradient: string; Icon: typeof Cpu }> = {
  'ai & machine learning': { gradient: styles.gradientTech, Icon: Cpu },
  'sustainability': { gradient: styles.gradientResearch, Icon: FlaskConical },
  'cybersecurity': { gradient: styles.gradientPedagogy, Icon: ShieldCheck },
  'academic writing': { gradient: styles.gradientNetworking, Icon: PenTool },
  'data science': { gradient: styles.gradientTech, Icon: BarChart3 },
  'general': { gradient: styles.gradientGeneral, Icon: BookOpen },
};

const FALLBACK_STYLES = Object.values(CATEGORY_STYLES);

function pickStyle(category?: string) {
  const key = (category || '').trim().toLowerCase();
  if (CATEGORY_STYLES[key]) return CATEGORY_STYLES[key];
  if (!key) return CATEGORY_STYLES.general;
  // Deterministic fallback so unrecognized categories still look varied and on-brand.
  const hash = Array.from(key).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return FALLBACK_STYLES[hash % FALLBACK_STYLES.length];
}

interface WorkshopThumbnailProps {
  imageUrl?: string | null;
  title: string;
  category?: string;
  className?: string;
}

export function WorkshopThumbnail({ imageUrl, title, category, className = '' }: WorkshopThumbnailProps) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={title} className={`${styles.image} ${className}`} />;
  }

  const { gradient, Icon } = pickStyle(category);

  return (
    <div className={`${styles.placeholder} ${gradient} ${className}`} role="img" aria-label={title}>
      <Icon size={36} className={styles.placeholderIcon} strokeWidth={1.5} />
    </div>
  );
}
