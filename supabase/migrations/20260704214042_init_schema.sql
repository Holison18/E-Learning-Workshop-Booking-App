-- =====================================================================
-- Workshop registration & admin console schema
-- Consolidated: all ALTER TABLE additions folded into their CREATE TABLE
-- statements, and CREATE TABLE IF NOT EXISTS used throughout so this
-- script is safe to (re)run against a fresh or existing database.
-- =====================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: participants
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    organization_name TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: workshops
CREATE TABLE IF NOT EXISTS public.workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    facilitator TEXT,
    location TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL,
    seats_booked INTEGER DEFAULT 0 NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) NOT NULL,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL, -- removes bookings when a workshop is deleted
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE(participant_id, workshop_id)
);

-- Table: admins
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: broadcasts
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admins(id) NOT NULL,
    title TEXT NOT NULL DEFAULT 'Announcement',
    message TEXT NOT NULL,
    recipient_group TEXT NOT NULL DEFAULT 'all',
    recipient_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- Row Level Security
-- =====================================================================

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Helper function: avoids infinite recursion in admin-checking policies.
-- A plain `EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())`
-- inside an admins policy re-triggers admins' own RLS, causing a cycle.
-- SECURITY DEFINER bypasses RLS since it runs as the function owner.
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

-- Policies: participants
DROP POLICY IF EXISTS "Participants can view their own profile" ON public.participants;
CREATE POLICY "Participants can view their own profile" ON public.participants FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Participants can update their own profile" ON public.participants;
CREATE POLICY "Participants can update their own profile" ON public.participants FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Participants can insert their own profile" ON public.participants;
CREATE POLICY "Participants can insert their own profile" ON public.participants FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all participants" ON public.participants;
CREATE POLICY "Admins can view all participants" ON public.participants FOR SELECT USING (public.is_admin(auth.uid()));

-- Policies: workshops
DROP POLICY IF EXISTS "Anyone can view workshops" ON public.workshops;
CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert workshops" ON public.workshops;
CREATE POLICY "Admins can insert workshops" ON public.workshops FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update workshops" ON public.workshops;
CREATE POLICY "Admins can update workshops" ON public.workshops FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete workshops" ON public.workshops;
CREATE POLICY "Admins can delete workshops" ON public.workshops FOR DELETE USING (public.is_admin(auth.uid()));

-- Policies: bookings
DROP POLICY IF EXISTS "Participants can view their own bookings" ON public.bookings;
CREATE POLICY "Participants can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = participant_id);

DROP POLICY IF EXISTS "Participants can create bookings" ON public.bookings;
CREATE POLICY "Participants can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = participant_id);

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (public.is_admin(auth.uid()));

-- Policies: admins
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
CREATE POLICY "Admins can insert admins" ON public.admins FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update admins" ON public.admins;
CREATE POLICY "Admins can update admins" ON public.admins FOR UPDATE USING (public.is_admin(auth.uid()));

-- Policies: broadcasts
DROP POLICY IF EXISTS "Anyone can view broadcasts" ON public.broadcasts;
CREATE POLICY "Anyone can view broadcasts" ON public.broadcasts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can insert broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================================
-- Storage: workshop banner images
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-banners', 'workshop-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view workshop banners" ON storage.objects;
CREATE POLICY "Anyone can view workshop banners" ON storage.objects
    FOR SELECT USING (bucket_id = 'workshop-banners');

DROP POLICY IF EXISTS "Admins can upload workshop banners" ON storage.objects;
CREATE POLICY "Admins can upload workshop banners" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update workshop banners" ON storage.objects;
CREATE POLICY "Admins can update workshop banners" ON storage.objects
    FOR UPDATE USING (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete workshop banners" ON storage.objects;
CREATE POLICY "Admins can delete workshop banners" ON storage.objects
    FOR DELETE USING (bucket_id = 'workshop-banners' AND public.is_admin(auth.uid()));

-- =====================================================================
-- Trigger: keep workshops.seats_booked in sync with bookings
-- =====================================================================

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

DROP TRIGGER IF EXISTS trigger_update_seats_booked ON public.bookings;
CREATE TRIGGER trigger_update_seats_booked
AFTER INSERT OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_seats_booked();