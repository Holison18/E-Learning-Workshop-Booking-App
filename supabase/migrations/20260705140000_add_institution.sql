ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS institution TEXT;
