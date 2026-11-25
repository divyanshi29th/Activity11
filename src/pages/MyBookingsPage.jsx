import { Link } from 'react-router-dom'

export default function MyBookingsPage({ bookings, loadingBookings }) {
  return (
    <section id="mybookings" className="card">
      <div className="section-header">
        <h2>My Ticket Bookings</h2>
        <Link to="/book" className="btn-small">
          Book Another Ticket
        </Link>
      </div>

      {loadingBookings ? (
        <p className="status-message">Loading your bookings from Supabase...</p>
      ) : (
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
                  <td colSpan={6}>No bookings available for your account yet.</td>
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
      )}
    </section>
  )
}
