# IPL Ticket Booking 2026 - Supabase Edition (Activity 11)

React + Vite application connected to a live PostgreSQL database via Supabase with real-time seat availability updates.

## Features

- **Live Match Schedule**: Fetches matches from Supabase (`matches` table) using `.from('matches').select('*')` inside `useEffect`.
- **Database Booking**: Inserts new bookings into `bookings` (`.insert()`) and decrements `available_seats` on `matches` (`.update().eq()`).
- **Realtime Sync**: Subscribes to `postgres_changes` on both `matches` and `bookings` so the UI auto-updates whenever database changes occur.

## Setup

1. Create a Supabase project and run [`supabase_setup.sql`](./supabase_setup.sql) in the Supabase SQL Editor.
2. Add your **Project URL** and **Publishable key** in `src/supabase.js` (or copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`).
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
