-- IPL Ticket Booking 2026 - Supabase PostgreSQL Setup
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- 1. Create matches table
CREATE TABLE IF NOT EXISTS matches (
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

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_code TEXT NOT NULL,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
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

-- 3. Enable Row Level Security and allow public read/write for demo app
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on matches" ON matches;
CREATE POLICY "Allow public read on matches"
  ON matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public update on matches" ON matches;
CREATE POLICY "Allow public update on matches"
  ON matches FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on bookings" ON bookings;
CREATE POLICY "Allow public read on bookings"
  ON bookings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert on bookings" ON bookings;
CREATE POLICY "Allow public insert on bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- 4. Enable Realtime broadcasts for matches and bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- 5. Insert sample IPL 2026 matches (only if table is empty)
INSERT INTO matches (match_number, teams, team_codes, date, venue, prices, available_seats)
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
WHERE NOT EXISTS (SELECT 1 FROM matches);
