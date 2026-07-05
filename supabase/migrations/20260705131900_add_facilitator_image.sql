-- Add facilitator image URL column to workshops
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS facilitator_image_url TEXT;

-- Storage bucket already created in 20260705131816_init_schema.sql
-- ("facilitator-images" bucket with public SELECT policy)
