import { useEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MatchCard from './components/MatchCard'
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

export default function App() {
  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(isSupabaseConfigured)
  const [dbError, setDbError] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState(
    isSupabaseConfigured ? 'connecting' : 'unconfigured'
  )

  const [selectedTeam, setSelectedTeam] = useState('all')
  const [viewMode, setViewMode] = useState('grid')

  const [selectedMatch, setSelectedMatch] = useState('')
  const [selectedStand, setSelectedStand] = useState('')
  const [tickets, setTickets] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState('e-ticket')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [bookings, setBookings] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)

  const showToast = (message) => {
    setToastMessage(message)
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('')
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    let isMounted = true

    const fetchInitialData = async () => {
      const [matchesResult, bookingsResult] = await Promise.all([
        supabase.from('matches').select('*').order('id', { ascending: true }),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      ])

      if (!isMounted) return

      if (matchesResult.error) {
        setDbError(`Failed to load matches: ${matchesResult.error.message}`)
      } else {
        setMatches((matchesResult.data || []).map(normalizeMatch))
      }

      if (bookingsResult.error) {
        setDbError((prev) =>
          prev
            ? `${prev} | Failed to load bookings: ${bookingsResult.error.message}`
            : `Failed to load bookings: ${bookingsResult.error.message}`
        )
      } else {
        setBookings(bookingsResult.data || [])
      }

      setLoadingMatches(false)
    }

    fetchInitialData()

    const channel = supabase
      .channel('ipl-live-updates')
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
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
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredMatches =
    selectedTeam === 'all'
      ? matches
      : matches.filter((match) => match.team_codes.includes(selectedTeam))

  const activeMatchObj = matches.find((m) => m.teams === selectedMatch)
  const unitPrice =
    activeMatchObj && selectedStand ? activeMatchObj.prices?.[selectedStand] || 0 : 0
  const quantity = Number.isNaN(Number(tickets)) || Number(tickets) < 1 ? 0 : Number(tickets)
  const totalAmount = unitPrice * quantity

  const handleSelectMatch = (match) => {
    setSelectedMatch(match.teams)
    const bookingEl = document.getElementById('booking')
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: 'smooth' })
    }
    showToast(`Selected ${match.teams}. Choose your stand and quantity!`)
  }

  const handleTeamFilterChange = (e) => {
    const team = e.target.value
    setSelectedTeam(team)
    showToast(
      team === 'all' ? 'Showing all IPL match cards.' : `Filtered matches for ${team}.`
    )
  }

  const resetFormFields = () => {
    setSelectedMatch('')
    setSelectedStand('')
    setTickets(1)
    setName('')
    setEmail('')
    setPhone('')
    setDelivery('e-ticket')
    setTermsAccepted(false)
  }

  const handleFormReset = () => {
    resetFormFields()
    showToast('Booking form and summary reset.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isSupabaseConfigured || !supabase) {
      showToast('Configure Supabase URL and Publishable key in src/supabase.js first.')
      return
    }

    if (!activeMatchObj) {
      showToast('Please select a valid match.')
      return
    }

    if (quantity < 1) {
      showToast('Please choose at least 1 ticket.')
      return
    }

    if (quantity > activeMatchObj.available_seats) {
      showToast(
        `Only ${activeMatchObj.available_seats} seat(s) left for ${activeMatchObj.teams}.`
      )
      return
    }

    setIsSubmitting(true)
    const bookingCode = `IPL-${Date.now().toString().slice(-6)}`
    const updatedSeats = activeMatchObj.available_seats - quantity

    const { data: insertedBooking, error: insertError } = await supabase
      .from('bookings')
      .insert([
        {
          booking_code: bookingCode,
          match_id: activeMatchObj.id,
          match_name: selectedMatch,
          customer_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          stand: selectedStand,
          tickets: quantity,
          delivery,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single()

    if (insertError) {
      setIsSubmitting(false)
      showToast(`Booking failed: ${insertError.message}`)
      return
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({ available_seats: updatedSeats })
      .eq('id', activeMatchObj.id)
      .select()
      .single()

    setIsSubmitting(false)

    if (updateError) {
      showToast(`Booked, but seat update failed: ${updateError.message}`)
    } else if (updatedMatch) {
      const normalized = normalizeMatch(updatedMatch)
      setMatches((prev) =>
        prev.map((m) => (m.id === normalized.id ? normalized : m))
      )
    }

    if (insertedBooking) {
      setBookings((prev) =>
        prev.some((b) => b.id === insertedBooking.id) ? prev : [insertedBooking, ...prev]
      )
    }

    showToast(`Booking confirmed for ${name}! Total: ₹${totalAmount}`)
    resetFormFields()
  }

  return (
    <>
      <Navbar />

      <Hero
        title="Experience The Stadium Energy Live!"
        subtitle="Connected to a live PostgreSQL database via Supabase with real-time seat updates."
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

        <section id="matches" className="card">
          <div className="section-header">
            <h2>Match Schedule</h2>
            <span className={`realtime-pill status-${realtimeStatus}`}>
              {realtimeStatus === 'connected'
                ? 'Live Sync: Connected'
                : realtimeStatus === 'unconfigured'
                  ? 'Live Sync: Not Configured'
                  : realtimeStatus === 'error'
                    ? 'Live Sync: Reconnecting'
                    : 'Live Sync: Connecting...'}
            </span>
          </div>

          <div className="schedule-controls">
            <div className="filter-group">
              <label htmlFor="team-filter">Filter by Team:</label>
              <select
                id="team-filter"
                value={selectedTeam}
                onChange={handleTeamFilterChange}
              >
                <option value="all">All Teams</option>
                <option value="RCB">RCB</option>
                <option value="CSK">CSK</option>
                <option value="MI">MI</option>
                <option value="KKR">KKR</option>
                <option value="SRH">SRH</option>
              </select>
            </div>

            <div className="view-toggle" role="group" aria-label="Match view toggle">
              <button
                type="button"
                className={`btn-small view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('grid')
                  showToast('Switched to Grid View.')
                }}
              >
                Grid View
              </button>
              <button
                type="button"
                className={`btn-small view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('list')
                  showToast('Switched to List View.')
                }}
              >
                List View
              </button>
            </div>
          </div>

          {loadingMatches ? (
            <p className="status-message">Loading live matches from Supabase...</p>
          ) : filteredMatches.length === 0 ? (
            <p className="status-message">
              No matches found in Supabase for the selected filter.
            </p>
          ) : (
            <div className={`match-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelectMatch={handleSelectMatch}
                />
              ))}
            </div>
          )}
        </section>

        <div className="booking-layout">
          <section id="booking" className="card">
            <h2>Book Your Ticket</h2>

            <form onSubmit={handleSubmit} onReset={handleFormReset}>
              <div className="form-group">
                <label htmlFor="name">Full Name:</label>
                <input
                  type="text"
                  id="name"
                  minLength={3}
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address:</label>
                <input
                  type="email"
                  id="email"
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number:</label>
                <input
                  type="tel"
                  id="phone"
                  minLength={10}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  title="Please enter a valid 10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="match">Match Selection:</label>
                <select
                  id="match"
                  value={selectedMatch}
                  onChange={(e) => {
                    setSelectedMatch(e.target.value)
                    showToast('Match updated in Booking Summary.')
                  }}
                  required
                >
                  <option value="">-- Select a Match --</option>
                  {matches.map((m) => (
                    <option
                      key={m.id}
                      value={m.teams}
                      disabled={m.available_seats <= 0}
                    >
                      {m.teams} ({m.venue}) — {m.available_seats} seats left
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="stand">Stand Category:</label>
                <select
                  id="stand"
                  value={selectedStand}
                  onChange={(e) => {
                    setSelectedStand(e.target.value)
                    showToast('Stand category updated in Booking Summary.')
                  }}
                  required
                >
                  <option value="">-- Select Stand Category --</option>
                  <option value="General">General</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tickets">Number of Tickets:</label>
                <input
                  type="number"
                  id="tickets"
                  min={1}
                  max={
                    activeMatchObj
                      ? Math.max(1, Math.min(10, activeMatchObj.available_seats))
                      : 10
                  }
                  value={tickets}
                  onChange={(e) => {
                    setTickets(e.target.value)
                    showToast('Ticket quantity updated in Booking Summary.')
                  }}
                  required
                />
              </div>

              <fieldset className="option-group">
                <legend>Ticket Delivery Method:</legend>
                <label className="option-item">
                  <input
                    type="radio"
                    name="delivery"
                    value="e-ticket"
                    checked={delivery === 'e-ticket'}
                    onChange={(e) => setDelivery(e.target.value)}
                    required
                  />
                  E-Ticket (Email &amp; QR Code)
                </label>
                <label className="option-item">
                  <input
                    type="radio"
                    name="delivery"
                    value="box-office"
                    checked={delivery === 'box-office'}
                    onChange={(e) => setDelivery(e.target.value)}
                  />
                  Stadium Box Office Pickup
                </label>
              </fieldset>

              <fieldset className="option-group">
                <legend>Preferences:</legend>
                <label className="option-item">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  I agree to the Stadium Guidelines &amp; Terms
                </label>
              </fieldset>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Booking...' : 'Book Now'}
                </button>
                <button type="reset" className="btn-reset" disabled={isSubmitting}>
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section id="booking-summary" className="card summary-card">
            <h2>Booking Summary</h2>
            <div className="summary-grid">
              <p>
                <strong>Match:</strong> {selectedMatch || 'Not selected'}
              </p>
              <p>
                <strong>Available Seats:</strong>{' '}
                {activeMatchObj ? activeMatchObj.available_seats : '—'}
              </p>
              <p>
                <strong>Stand Category:</strong> {selectedStand || 'Not selected'}
              </p>
              <p>
                <strong>Ticket Price:</strong> ₹{unitPrice}
              </p>
              <p>
                <strong>Quantity:</strong> {quantity}
              </p>
              <p className="summary-total">
                <strong>Total Amount:</strong> ₹{totalAmount}
              </p>
            </div>
          </section>
        </div>

        <section id="mybookings" className="card">
          <h2>My Ticket Bookings</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Match</th>
                  <th>Stand</th>
                  <th>Tickets</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No bookings available.</td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.booking_code || `IPL-${booking.id}`}</td>
                      <td>{booking.customer_name}</td>
                      <td>{booking.match_name}</td>
                      <td>{booking.stand}</td>
                      <td>{booking.tickets}</td>
                      <td>₹{booking.total_amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="guidelines" className="card">
          <h2>Stadium Guidelines</h2>
          <div className="guidelines-grid">
            <article className="guideline-card">
              <h3>Ticket Verification</h3>
              <p>Carry your valid digital or printed match ticket for gate entry.</p>
            </article>
            <article className="guideline-card">
              <h3>ID Proof Requirement</h3>
              <p>Bring a government-issued photo ID matching your booking details.</p>
            </article>
            <article className="guideline-card">
              <h3>Prohibited Items</h3>
              <p>Weapons, sharp objects, and outside food or bottles are not allowed.</p>
            </article>
          </div>
        </section>
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
