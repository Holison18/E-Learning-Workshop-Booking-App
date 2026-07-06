ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS overbooking_limit INTEGER NOT NULL DEFAULT 0;

UPDATE public.workshops
SET overbooking_limit = capacity
WHERE overbooking_limit = 0;

-- Ensure seats_booked trigger exists (idempotent)
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
