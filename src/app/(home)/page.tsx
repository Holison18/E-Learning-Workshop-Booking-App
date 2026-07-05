import React from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { GraduationCap, Calendar, MapPin, Users, ArrowRight, Clock, Award, BookOpen } from 'lucide-react';

type Workshop = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  seats_booked: number;
  facilitator: string;
  location: string;
  image_url?: string;
  category?: string | null;
};

const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">' +
  '<rect width="600" height="340" fill="#F3F4F6"/>' +
  '<text x="300" y="175" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="16">No Image</text>' +
  '</svg>'
);

const formatTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m);
  const hrs = d.getHours();
  const mins = d.getMinutes();
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const h12 = hrs % 12 || 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
};

async function getWorkshops(): Promise<Workshop[]> {
  const { data } = await supabaseAdmin
    .from('workshops')
    .select('*')
    .order('date', { ascending: true })
    .limit(4);

  return (data || []) as Workshop[];
}

export default async function HomePage() {
  const workshops = await getWorkshops();

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #A32020 0%, #7A1A1A 50%, #4A0E0E 100%)',
        color: '#fff',
        padding: '5rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 30%, rgba(255,255,255,0.04) 0%, transparent 50%)',
        }} />
        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            padding: '0.5rem 1.25rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600, marginBottom: '2rem',
          }}>
            <GraduationCap size={16} />
            KNUST E-Learning Week
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            color: '#fff',
          }}>
            Discover Workshops That<br />Shape Your Future
          </h1>
          <p style={{
            fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.9,
            maxWidth: '540px', margin: '0 auto 2rem',
          }}>
            Browse, book, and attend hands-on workshops led by industry experts.
            Expand your skills beyond the classroom.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/workshops"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.875rem 2rem',
                background: '#fff', color: '#A32020',
                borderRadius: '10px', fontSize: '1rem', fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
            >
              Explore Workshops <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: '4.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem', fontWeight: 700,
          textAlign: 'center', marginBottom: '0.5rem',
        }}>
          How It Works
        </h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '3rem', fontSize: '0.95rem' }}>
          Three simple steps to get started
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
        }}>
          {[
            { icon: <BookOpen size={28} />, title: 'Browse Workshops', desc: 'Explore our curated catalog of workshops across various disciplines and skill levels.' },
            { icon: <Calendar size={28} />, title: 'Book Your Spot', desc: 'Reserve your place in any workshop with just a click. Seats are limited.' },
            { icon: <Award size={28} />, title: 'Attend & Earn', desc: 'Participate, learn from experts, and earn certificates for completed workshops.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: '16px', padding: '2rem',
              textAlign: 'center',
              border: '1px solid #E5E7EB',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '14px',
                background: 'var(--primary-red-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem', color: 'var(--primary-red)',
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Workshops ── */}
      {workshops.length > 0 && (
        <section style={{
          padding: '4.5rem 2rem',
          background: '#fff',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Featured Workshops
                </h2>
                <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
                  Hand-picked sessions to kickstart your learning journey
                </p>
              </div>
              <Link href="/workshops" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                color: 'var(--primary-red)', fontWeight: 600, fontSize: '0.9rem',
                textDecoration: 'none',
              }}>
                View All <ArrowRight size={16} />
              </Link>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}>
              {workshops.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: '#fff', borderRadius: '14px', overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                    display: 'flex', flexDirection: 'column',
                  }}
                >
                  <div style={{
                    width: '100%', height: '180px', overflow: 'hidden',
                    background: '#F3F4F6',
                  }}>
                    <img
                      src={w.image_url || FALLBACK_IMG}
                      alt={w.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {w.category && (
                      <span style={{
                        display: 'inline-block', alignSelf: 'flex-start',
                        fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-red)',
                        background: 'var(--primary-red-light)',
                        padding: '0.2rem 0.6rem', borderRadius: '999px',
                        marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {w.category}
                      </span>
                    )}
                    <h3 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem',
                      lineHeight: 1.3,
                    }}>
                      {w.title}
                    </h3>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#666' }}>
                        <Calendar size={13} />
                        {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        <span style={{ marginLeft: '0.5rem' }}>⏰ {formatTime(w.start_time)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#666' }}>
                        <MapPin size={13} />
                        {w.location}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#666' }}>
                        <Users size={13} />
                        {Math.max(w.capacity - (w.seats_booked || 0), 0)} seat{Math.max(w.capacity - (w.seats_booked || 0), 0) !== 1 ? 's' : ''} left
                      </div>
                    </div>
                    <Link
                      href={`/workshops/${w.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--primary-red)', color: '#fff',
                        borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Details <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Stats ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem', textAlign: 'center',
        }}>
          {[
            { num: '50+', label: 'Workshops' },
            { num: '1,200+', label: 'Participants' },
            { num: '30+', label: 'Expert Facilitators' },
            { num: '5', label: 'E-Learning Week Days' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.5rem', fontWeight: 800,
                color: 'var(--primary-red)',
                lineHeight: 1,
                marginBottom: '0.5rem',
              }}>
                {s.num}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg, #A32020 0%, #7A1A1A 100%)',
        color: '#fff', textAlign: 'center',
        padding: '4.5rem 2rem',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem', fontWeight: 700,
          color: '#fff', marginBottom: '0.75rem',
        }}>
          Ready to Level Up?
        </h2>
        <p style={{ opacity: 0.9, marginBottom: '2rem', fontSize: '1.05rem' }}>
          Don&apos;t miss out — secure your spot today.
        </p>
        <Link
          href="/workshops"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.875rem 2.5rem',
            background: '#fff', color: '#A32020',
            borderRadius: '10px', fontSize: '1rem', fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          }}
        >
          Browse All Workshops <ArrowRight size={18} />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '2rem', textAlign: 'center',
        color: '#999', fontSize: '0.8125rem',
        borderTop: '1px solid #E5E7EB',
        background: '#fff',
      }}>
        &copy; {new Date().getFullYear()} KNUST E-Learning Week. All rights reserved.
      </footer>
    </div>
  );
}
