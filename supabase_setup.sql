-- IPL Ticket Booking 2026 - Supabase PostgreSQL + Auth RLS Setup
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- 1. Create matches table (publicly readable, seat updates by authenticated users)
CREATE TABLE IF NOT EXISTS public.matches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_number TEXT NOT NULL,
  teams TEXT NOT NULL,
  team_codes TEXT[] NOT NULL,
  date TEXT NOT NULL,
  venue TEXT NOT NULL,
  prices JSONB NOT NULL,
  available_seats INTEGER NOT NULL DEFAULT 100 CHECK (available_seats >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create bookings table scoped to authenticated users via user_id
CREATE TABLE IF NOT EXISTS public.bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_code TEXT NOT NULL,
  match_id BIGINT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  match_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  stand TEXT NOT NULL,
  tickets INTEGER NOT NULL CHECK (tickets > 0),
  delivery TEXT NOT NULL DEFAULT 'e-ticket',
  total_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If upgrading an existing bookings table from before Auth was added:
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bookings_match_id ON public.bookings(match_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);

-- 3. Grant least-privilege Data API table permissions and enable RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON public.matches FROM anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT UPDATE (available_seats) ON public.matches TO authenticated;

REVOKE ALL ON public.bookings FROM anon, authenticated;
GRANT SELECT, INSERT ON public.bookings TO authenticated;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Matches policies
DROP POLICY IF EXISTS "Allow public read on matches" ON public.matches;
CREATE POLICY "Allow public read on matches"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public update on matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated seat updates on matches" ON public.matches;
CREATE POLICY "Allow authenticated seat updates on matches"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (available_seats >= 0);

-- Bookings policies (strictly scoped to the signed-in owner)
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- 4. Enable Realtime broadcasts for matches and bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- 5. Insert sample IPL 2026 matches (only if table is empty)
INSERT INTO public.matches (match_number, teams, team_codes, date, venue, prices, available_seats)
SELECT * FROM (
  VALUES
    (
      'Match 1',
      'RCB vs MI',
      ARRAY['RCB', 'MI'],
      '01-04-2026',
      'Bengaluru',
      '{"General": 800, "Premium": 1500, "VIP": 3000}'::jsonb,
      120
    ),
    (
      'Match 2',
      'CSK vs KKR',
      ARRAY['CSK', 'KKR'],
      '03-04-2026',
      'Chennai',
      '{"General": 700, "Premium": 1400, "VIP": 2800}'::jsonb,
      95
    ),
    (
      'Match 3',
      'MI vs SRH',
      ARRAY['MI', 'SRH'],
      '05-04-2026',
      'Mumbai',
      '{"General": 850, "Premium": 1600, "VIP": 3200}'::jsonb,
      150
    )
) AS seed(match_number, teams, team_codes, date, venue, prices, available_seats)
WHERE NOT EXISTS (SELECT 1 FROM public.matches);
