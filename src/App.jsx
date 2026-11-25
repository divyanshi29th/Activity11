import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import MatchesPage from './pages/MatchesPage'
import BookingPage from './pages/BookingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import LoginPage from './pages/LoginPage'
import { isSupabaseConfigured, supabase } from './supabase'

function normalizeMatch(row) {
  return {
    ...row,
    match_number: row.match_number ?? row.matchNumber ?? `Match ${row.id}`,
    team_codes: Array.isArray(row.team_codes)
      ? row.team_codes
      : Array.isArray(row.teamCodes)
        ? row.teamCodes
        : [],
    prices: row.prices ?? { General: 800, Premium: 1500, VIP: 3000 },
    available_seats: Number(row.available_seats ?? 0),
  }
}

function AppShell() {
  const { claims } = useAuth()
  const userId = claims?.sub ?? null

  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(isSupabaseConfigured)
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [dbError, setDbError] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState(
    isSupabaseConfigured ? 'connecting' : 'unconfigured'
  )

  const [selectedMatch, setSelectedMatch] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)

  const showToast = useCallback((message) => {
    setToastMessage(message)
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('')
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  // Fetch public matches & subscribe to realtime match updates
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    let isMounted = true

    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('id', { ascending: true })

      if (!isMounted) return

      if (error) {
        setDbError(`Failed to load matches: ${error.message}`)
      } else {
        setMatches((data || []).map(normalizeMatch))
      }
      setLoadingMatches(false)
    }

    fetchMatches()

    const matchesChannel = supabase
      .channel('ipl-matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const added = normalizeMatch(payload.new)
            setMatches((prev) =>
              prev.some((m) => m.id === added.id)
                ? prev
                : [...prev, added].sort((a, b) => a.id - b.id)
            )
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeMatch(payload.new)
            setMatches((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            )
          } else if (payload.eventType === 'DELETE') {
            setMatches((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        if (!isMounted) return
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('error')
        } else {
          setRealtimeStatus('connecting')
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(matchesChannel)
    }
  }, [])

  // Fetch & subscribe to authenticated user's own bookings (enforced by RLS + client filter)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      return
    }

    let isMounted = true

    const fetchUserBookings = async () => {
      setLoadingBookings(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setDbError(`Failed to load bookings: ${error.message}`)
      } else {
        setBookings(data || [])
      }
      setLoadingBookings(false)
    }

    fetchUserBookings()

    const bookingsChannel = supabase
      .channel(`ipl-bookings-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings((prev) =>
              prev.some((b) => b.id === payload.new.id) ? prev : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setBookings((prev) =>
              prev.map((b) => (b.id === payload.new.id ? payload.new : b))
            )
          } else if (payload.eventType === 'DELETE') {
            setBookings((prev) => prev.filter((b) => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(bookingsChannel)
    }
  }, [userId])

  const visibleBookings = userId ? bookings : []

  const handleSelectMatch = (match) => {
    setSelectedMatch(match.teams)
    showToast(`Selected ${match.teams}.`)
  }

  const handleMatchUpdated = (updatedRow) => {
    const normalized = normalizeMatch(updatedRow)
    setMatches((prev) => prev.map((m) => (m.id === normalized.id ? normalized : m)))
  }

  const handleBookingCreated = (newBooking) => {
    setBookings((prev) =>
      prev.some((b) => b.id === newBooking.id) ? prev : [newBooking, ...prev]
    )
  }

  return (
    <>
      <Navbar onShowToast={showToast} />

      <Hero
        title="Experience The Stadium Energy Live!"
        subtitle="Connected to a live PostgreSQL database via Supabase with Auth, Protected Routes, and real-time seat updates."
      />

      <main className="container">
        {!isSupabaseConfigured && (
          <section className="card setup-banner" role="alert">
            <h2>Supabase Configuration Required</h2>
            <p>
              Add your Supabase Project URL and Publishable key in{' '}
              <code>src/supabase.js</code> (or <code>.env</code>) and run{' '}
              <code>supabase_setup.sql</code> in the Supabase SQL Editor to load live
              matches and bookings.
            </p>
          </section>
        )}

        {dbError && (
          <section className="card error-banner" role="alert">
            <p>{dbError}</p>
          </section>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <MatchesPage
                matches={matches}
                loadingMatches={loadingMatches}
                realtimeStatus={realtimeStatus}
                onSelectMatch={handleSelectMatch}
                onShowToast={showToast}
              />
            }
          />
          <Route path="/login" element={<LoginPage onShowToast={showToast} />} />
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <BookingPage
                  matches={matches}
                  selectedMatch={selectedMatch}
                  setSelectedMatch={setSelectedMatch}
                  onBookingCreated={handleBookingCreated}
                  onMatchUpdated={handleMatchUpdated}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage
                  bookings={visibleBookings}
                  loadingBookings={loadingBookings}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        <p>Copyright &copy; 2026 IPL Ticket Booking. All Rights Reserved.</p>
      </footer>

      <div
        className={`toast ${toastMessage ? 'show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
