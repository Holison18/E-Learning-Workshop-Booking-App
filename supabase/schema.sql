-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: participants
CREATE TABLE public.participants (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    organization_name TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: workshops
CREATE TABLE public.workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    facilitator TEXT,
    location TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL,
    seats_booked INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES public.participants(id) NOT NULL,
    workshop_id UUID REFERENCES public.workshops(id) NOT NULL,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE(participant_id, workshop_id)
);

-- Table: admins
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: broadcasts
CREATE TABLE public.broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.admins(id) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Policies for participants
-- Participants can read and update their own profile
CREATE POLICY "Participants can view their own profile" ON public.participants FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Participants can update their own profile" ON public.participants FOR UPDATE USING (auth.uid() = id);
-- Admins can view all participants
CREATE POLICY "Admins can view all participants" ON public.participants FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Policies for workshops
-- Anyone can view workshops
CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT USING (true);
-- Only admins can modify workshops
CREATE POLICY "Admins can insert workshops" ON public.workshops FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can update workshops" ON public.workshops FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can delete workshops" ON public.workshops FOR DELETE USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Policies for bookings
-- Participants can view and manage their own bookings
CREATE POLICY "Participants can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = participant_id);
CREATE POLICY "Participants can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = participant_id);
-- Admins can view and manage all bookings
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Policies for admins
-- Admins can view other admins
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Policies for broadcasts
-- Anyone can read broadcasts
CREATE POLICY "Anyone can view broadcasts" ON public.broadcasts FOR SELECT USING (true);
-- Only admins can insert broadcasts
CREATE POLICY "Admins can insert broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Function and trigger to update seats_booked in workshops table automatically
CREATE OR REPLACE FUNCTION update_seats_booked()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workshops
        SET seats_booked = seats_booked + 1
        WHERE id = NEW.workshop_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workshops
        SET seats_booked = seats_booked - 1
        WHERE id = OLD.workshop_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seats_booked
AFTER INSERT OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_seats_booked();

-- =====================================================================
-- Migration: Admin console redesign (workshop metadata, admin profiles,
-- broadcast tracking, workshop banner storage).
--
-- Run this against the Supabase SQL editor (or `supabase db push`) for
-- any project created before this migration was added.
-- =====================================================================

-- Workshops: category, publish status, banner image
ALTER TABLE public.workshops
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Admins: profile fields so the console can render a Team Management list
-- without needing service-role access to auth.users.
ALTER TABLE public.admins
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'coordinator' CHECK (role IN ('super_admin', 'coordinator')),
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending'));

-- Broadcasts: subject line, recipient targeting, and delivery status so the
-- Announcements table can show more than the raw message body.
ALTER TABLE public.broadcasts
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Announcement',
    ADD COLUMN IF NOT EXISTS recipient_group TEXT NOT NULL DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed'));

-- Admins can manage other admin rows (Team Management screen)
CREATE POLICY "Admins can insert admins" ON public.admins FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can update admins" ON public.admins FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Storage bucket for workshop banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-banners', 'workshop-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view workshop banners" ON storage.objects
    FOR SELECT USING (bucket_id = 'workshop-banners');

CREATE POLICY "Admins can upload workshop banners" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'workshop-banners'
        AND EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
    );

CREATE POLICY "Admins can update workshop banners" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'workshop-banners'
        AND EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
    );

CREATE POLICY "Admins can delete workshop banners" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'workshop-banners'
        AND EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
    );

-- =====================================================================
-- Migration: Fix infinite recursion in admin RLS policies
--
-- Every "is this user an admin?" policy above does
-- `EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())`.
-- That subquery is itself a query against `admins`, which re-triggers
-- admins' own RLS policies, which run the same subquery again — Postgres
-- detects the cycle and returns a 500 (only surfaces once admins has rows).
--
-- Fix: a SECURITY DEFINER function bypasses RLS (it runs as the function's
-- owner, which owns the table), so policies can call it instead of
-- re-querying the protected table directly.
--
-- Run this against the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = check_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;

DROP POLICY IF EXISTS "Admins can view all participants" ON public.participants;
CREATE POLICY "Admins can view all participants" ON public.participants FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert workshops" ON public.workshops;
CREATE POLICY "Admins can insert workshops" ON public.workshops FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update workshops" ON public.workshops;
CREATE POLICY "Admins can update workshops" ON public.workshops FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete workshops" ON public.workshops;
CREATE POLICY "Admins can delete workshops" ON public.workshops FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
CREATE POLICY "Admins can insert admins" ON public.admins FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update admins" ON public.admins;
CREATE POLICY "Admins can update admins" ON public.admins FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can insert broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can upload workshop banners" ON storage.objects;
CREATE POLICY "Admins can upload workshop banners" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update workshop banners" ON storage.objects;
CREATE POLICY "Admins can update workshop banners" ON storage.objects
    FOR UPDATE USING (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete workshop banners" ON storage.objects;
CREATE POLICY "Admins can delete workshop banners" ON storage.objects
    FOR DELETE USING (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

-- Add missing INSERT policy for participants
CREATE POLICY "Participants can insert their own profile" ON public.participants FOR INSERT WITH CHECK (auth.uid() = id);
