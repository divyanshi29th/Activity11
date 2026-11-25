import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { isSupabaseConfigured, supabase } from '../supabase'

export default function BookingPage({
  matches,
  selectedMatch,
  setSelectedMatch,
  onBookingCreated,
  onMatchUpdated,
  onShowToast,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { claims, user } = useAuth()

  const preselected = location.state?.preselectedMatch
  const currentMatch = selectedMatch || preselected || ''

  const [selectedStand, setSelectedStand] = useState('')
  const [tickets, setTickets] = useState(1)
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || claims?.email || '')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState('e-ticket')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeMatchObj = matches.find((m) => m.teams === currentMatch)
  const unitPrice =
    activeMatchObj && selectedStand ? activeMatchObj.prices?.[selectedStand] || 0 : 0
  const quantity =
    Number.isNaN(Number(tickets)) || Number(tickets) < 1 ? 0 : Number(tickets)
  const totalAmount = unitPrice * quantity

  const resetFormFields = () => {
    setSelectedMatch('')
    setSelectedStand('')
    setTickets(1)
    setName(user?.user_metadata?.full_name || '')
    setEmail(user?.email || claims?.email || '')
    setPhone('')
    setDelivery('e-ticket')
    setTermsAccepted(false)
  }

  const handleFormReset = () => {
    resetFormFields()
    onShowToast('Booking form and summary reset.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isSupabaseConfigured || !supabase) {
      onShowToast('Configure Supabase URL and Publishable key in src/supabase.js first.')
      return
    }

    if (!claims?.sub) {
      onShowToast('Please sign in to complete your booking.')
      navigate('/login')
      return
    }

    if (!activeMatchObj) {
      onShowToast('Please select a valid match.')
      return
    }

    if (quantity < 1) {
      onShowToast('Please choose at least 1 ticket.')
      return
    }

    if (quantity > activeMatchObj.available_seats) {
      onShowToast(
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
          user_id: claims.sub,
          booking_code: bookingCode,
          match_id: activeMatchObj.id,
          match_name: currentMatch,
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
      onShowToast(`Booking failed: ${insertError.message}`)
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
      onShowToast(`Booked, but seat update failed: ${updateError.message}`)
    } else if (updatedMatch) {
      onMatchUpdated(updatedMatch)
    }

    if (insertedBooking) {
      onBookingCreated(insertedBooking)
    }

    onShowToast(`Booking confirmed for ${name}! Total: ₹${totalAmount}`)
    resetFormFields()
    navigate('/my-bookings')
  }

  return (
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
              value={currentMatch}
              onChange={(e) => {
                setSelectedMatch(e.target.value)
                onShowToast('Match updated in Booking Summary.')
              }}
              required
            >
              <option value="">-- Select a Match --</option>
              {matches.map((m) => (
                <option key={m.id} value={m.teams} disabled={m.available_seats <= 0}>
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
                onShowToast('Stand category updated in Booking Summary.')
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
                onShowToast('Ticket quantity updated in Booking Summary.')
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
            <strong>Signed In As:</strong> {user?.email || claims?.email || 'Authenticated'}
          </p>
          <p>
            <strong>Match:</strong> {currentMatch || 'Not selected'}
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
  )
}
