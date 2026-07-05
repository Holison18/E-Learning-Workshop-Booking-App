'use client';

import React, { useState } from 'react';
import styles from './Avatar.module.css';

// Deliberately loose: full Supabase User objects satisfy this, but so does a
// lightweight { id } for people we only know about via the participants
// table (e.g. someone else's booking in the admin roster).
type UserLike = {
  id?: string | null;
  user_metadata?: { avatar_url?: string; picture?: string } | null;
} | null | undefined;

interface AvatarProps {
  user: UserLike;
  name: string;
  size?: number;
  className?: string;
}

function getGoogleAvatarUrl(user: UserLike): string | undefined {
  const metadata = user?.user_metadata || {};
  return metadata.avatar_url || metadata.picture;
}

// Deterministic per-user "cool icon" avatar for accounts with no Google photo,
// so everyone gets a distinct, friendly identity instead of a bare initial.
function getGeneratedAvatarUrl(user: UserLike, name: string): string {
  const seed = user?.id || name || 'guest';
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=fbebeb,f3f4f6,ffffff`;
}

type Stage = 'primary' | 'generated' | 'initials';

export function Avatar({ user, name, size = 40, className = '' }: AvatarProps) {
  const googleUrl = getGoogleAvatarUrl(user);
  const [stage, setStage] = useState<Stage>(googleUrl ? 'primary' : 'generated');

  if (stage === 'initials') {
    return (
      <div
        className={`${styles.initials} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    );
  }

  const src = stage === 'primary' ? googleUrl! : getGeneratedAvatarUrl(user, name);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`${styles.image} ${className}`}
      style={{ width: size, height: size }}
      onError={() => setStage((prev) => (prev === 'primary' ? 'generated' : 'initials'))}
    />
  );
}
