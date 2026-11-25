# IPL Ticket Booking 2026 - Supabase Auth & Database (Activity 11)

React + Vite application connected to a live PostgreSQL database via Supabase with **Supabase Auth**, **React Router Protected Routes**, user-scoped **Row Level Security (RLS)**, and real-time seat availability updates.

## Features

- **Public Match Schedule (`/`)**: Fetches live matches from Supabase (`matches` table) using `.from('matches').select('*')` inside `useEffect`, with team filtering, grid/list toggle, and live Realtime updates.
- **Supabase Auth (`/login`)**: Email & password sign-in and account creation (`signInWithPassword` / `signUp`), verified via `supabase.auth.getClaims()` and `onAuthStateChange`.
- **Protected Routes (`/book`, `/my-bookings`)**: Wrapped in `<ProtectedRoute>` so unauthenticated visitors are redirected to `/login` and returned to their intended page after signing in.
- **Database Booking & User-Scoped RLS**: Inserts new bookings tagged with `user_id` into `bookings` (`.insert()`) and decrements `available_seats` on `matches` (`.update().eq()`). RLS policies ensure authenticated users can only read and insert their own bookings.
- **Realtime Sync**: Subscribes to `postgres_changes` on `matches` and user-scoped `bookings` so the UI auto-updates whenever database changes occur.

## Setup

1. Create a Supabase project and run [`supabase_setup.sql`](./supabase_setup.sql) in the Supabase SQL Editor.
2. Add your **Project URL** and **Publishable key** in `src/supabase.js` (or copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`).
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
