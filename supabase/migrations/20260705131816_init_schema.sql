-- =====================================================================
-- Workshop registration & admin console schema
-- Consolidated: all ALTER TABLE additions folded into their CREATE TABLE
-- statements, and CREATE TABLE IF NOT EXISTS used throughout so this
-- script is safe to (re)run against a fresh or existing database.
-- =====================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL, -- removes bookings when a workshop is deleted
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE(user_id, workshop_id)
);

-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_participant_id_fkey;
-- ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE NOT NULL;

-- Table: admins
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ALTER TABLE public.admins
--ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.admins
ADD COLUMN IF NOT EXISTS password TEXT;


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




-- Policies: bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);



-- Policies: broadcasts
DROP POLICY IF EXISTS "Anyone can view broadcasts" ON public.broadcasts;
CREATE POLICY "Anyone can view broadcasts" ON public.broadcasts FOR SELECT USING (true);

-- =====================================================================
-- Storage: workshop banner images
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-banners', 'workshop-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view workshop banners" ON storage.objects;
CREATE POLICY "Anyone can view workshop banners" ON storage.objects
    FOR SELECT USING (bucket_id = 'workshop-banners');


-- =====================================================================
-- Storage: facilitator images
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('facilitator-images', 'facilitator-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view facilitator images" ON storage.objects;
CREATE POLICY "Anyone can view facilitator images" ON storage.objects
    FOR SELECT USING (bucket_id = 'facilitator-images');

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