'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UploadCloud, X, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from './WorkshopForm.module.css';

const CATEGORIES = ['AI & Machine Learning', 'Sustainability', 'Cybersecurity', 'Academic Writing', 'Data Science', 'General'];
const CAPACITY_GAUGE_MAX = 500;

type FormState = {
  title: string;
  description: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  location: string;
  facilitator: string;
  facilitator_image_url: string;
  image_url: string;
  status: 'draft' | 'published';
};

const emptyForm: FormState = {
  title: '',
  description: '',
  category: '',
  date: '',
  start_time: '',
  end_time: '',
  capacity: 50,
  location: '',
  facilitator: '',
  facilitator_image_url: '',
  image_url: '',
  status: 'draft',
};

export function WorkshopForm({ mode, workshopId }: { mode: 'create' | 'edit'; workshopId?: string }) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !workshopId) return;

    (async () => {
      try {
        const res = await fetch(`/api/admin/workshop?id=${workshopId}`);
        if (!res.ok) throw new Error('Failed to fetch workshop');
        const json = await res.json();
        const workshops: any[] = json.data || [];
        const data = workshops.find((w: any) => w.id === workshopId);
        if (data) {
          setFormData({
            title: data.title ?? '',
            description: data.description ?? '',
            category: data.category ?? '',
            date: data.date ?? '',
            start_time: (data.start_time ?? '').slice(0, 5),
            end_time: (data.end_time ?? '').slice(0, 5),
            capacity: data.capacity ?? 50,
            location: data.location ?? '',
            facilitator: data.facilitator ?? '',
            facilitator_image_url: data.facilitator_image_url ?? '',
            image_url: data.image_url ?? '',
            status: (data.status as 'draft' | 'published') ?? 'draft',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workshop');
      }
      setFetching(false);
    })();
  }, [mode, workshopId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      if (!res.ok) {
        const data = await res.json();
        setError(`Banner upload failed: ${data.error || 'Unknown error'}`);
        setUploading(false);
        return;
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, image_url: data.url }));
    } catch {
      setError('Banner upload failed: Network error');
    }
    setUploading(false);
  };

  const handleFacilitatorImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/admin/upload/facilitator', { method: 'POST', body });
      if (!res.ok) {
        const data = await res.json();
        setError(`Image upload failed: ${data.error || 'Unknown error'}`);
        setUploading(false);
        return;
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, facilitator_image_url: data.url }));
    } catch {
      setError('Facilitator image upload failed: Network error');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category || null,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      capacity: formData.capacity,
      location: formData.location,
      facilitator: formData.facilitator,
      facilitator_image_url: formData.facilitator_image_url || null,
      image_url: formData.image_url || null,
      status: formData.status,
    };

    const res = await fetch('/api/admin/workshop', {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'create' ? payload : { ...payload, id: workshopId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to save workshop');
      setLoading(false);
      return;
    }

    router.push('/admin/workshops');
  };

  if (fetching) return <div>Loading workshop...</div>;

  const gaugePercent = Math.min((formData.capacity / CAPACITY_GAUGE_MAX) * 100, 100);

  return (
    <form onSubmit={handleSubmit} className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{mode === 'create' ? 'Add New Workshop' : 'Edit Workshop'}</h1>
          <p className={styles.subtitle}>
            Configure and publish a new learning session for the KNUST E-Learning catalog.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/workshops">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading || uploading}>
            {loading ? 'Saving...' : 'Save Workshop'}
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorText}>{error}</div>}

      <div className={styles.layout}>
        <div className={styles.column}>
          <Card>
            <CardContent>
              <h2 className={styles.cardTitle}>Basic Information</h2>
              <div className={styles.form}>
                <Input
                  label="Workshop Title"
                  name="title"
                  placeholder="e.g., Advanced Neural Networks with Python"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
                <div className={styles.row}>
                  <div className={styles.textareaWrapper}>
                    <label className={styles.textareaLabel}>Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} required>
                      <option value="" disabled>Select Category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Number of Seats"
                    name="capacity"
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Input
                  label="Facilitator Name"
                  name="facilitator"
                  placeholder="e.g., Dr. Kwame Mensah"
                  value={formData.facilitator}
                  onChange={handleChange}
                  required
                />
                <div className={styles.facilitatorUpload}>
                  {formData.facilitator_image_url ? (
                    <img src={formData.facilitator_image_url} alt="" className={styles.facilitatorAvatar} />
                  ) : (
                    <div className={styles.facilitatorAvatarPlaceholder}>
                      <User size={20} />
                    </div>
                  )}
                  <div>
                    <label className={styles.avatarUploadBtn}>
                      <UploadCloud size={14} />
                      {formData.facilitator_image_url ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className={styles.hiddenInput}
                        onChange={handleFacilitatorImageSelect}
                        disabled={uploading}
                      />
                    </label>
                    <div className={styles.dropzoneHint}>Square image recommended</div>
                  </div>
                </div>
                <div className={styles.textareaWrapper}>
                  <label className={styles.textareaLabel}>Detailed Description</label>
                  <textarea
                    name="description"
                    className={styles.textarea}
                    placeholder="Describe the curriculum, learning outcomes, and prerequisites..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className={styles.cardTitle}>Schedule &amp; Venue</h2>
              <div className={styles.form}>
                <div className={styles.row}>
                  <Input
                    label="Workshop Date"
                    name="date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Venue / Location"
                    name="location"
                    placeholder="e.g., CoE Auditorium"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.row}>
                  <Input
                    label="Start Time"
                    name="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="End Time"
                    name="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={styles.column}>
          <Card>
            <CardContent>
              <h2 className={styles.cardTitle}>Total Capacity</h2>
              <div className={styles.gaugeWrapper}>
                <div
                  className={styles.gauge}
                  style={{
                    background: `conic-gradient(var(--primary-red) 0% ${gaugePercent}%, var(--primary-red-light) ${gaugePercent}% 100%)`,
                  }}
                >
                  <div className={styles.gaugeCenter}>
                    <span className={styles.gaugeValue}>{formData.capacity}</span>
                  </div>
                </div>
                <p className={styles.gaugeCaption}>Provisional number of participants</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className={styles.cardTitle}>Configuration</h2>
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.toggleLabel}>Publishing Status</div>
                  <div className={styles.toggleDescription}>
                    {formData.status === 'published'
                      ? 'Visible to participants in the workshop catalog.'
                      : 'Saved as a draft — hidden from participants.'}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.switch} ${formData.status === 'published' ? styles.switchOn : ''}`}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, status: prev.status === 'published' ? 'draft' : 'published' }))
                  }
                  aria-pressed={formData.status === 'published'}
                  aria-label="Toggle publishing status"
                >
                  <span className={styles.switchKnob} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className={styles.cardTitle}>Workshop Media</h2>
              <label className={styles.textareaLabel} style={{ display: 'block', marginBottom: '0.5rem' }}>Banner Image</label>
              {formData.image_url ? (
                <div className={styles.bannerPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.image_url} alt="Workshop banner" />
                  <button
                    type="button"
                    className={styles.bannerRemove}
                    onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className={styles.dropzone}>
                  <UploadCloud size={28} className={styles.dropzoneIcon} />
                  <div className={styles.dropzoneText}>
                    {uploading ? 'Uploading...' : 'Click to upload banner image'}
                  </div>
                  <div className={styles.dropzoneHint}>PNG, JPG up to 5MB. Recommended: 1200 x 400px</div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className={styles.hiddenInput}
                    onChange={handleImageSelect}
                    disabled={uploading}
                  />
                </label>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
