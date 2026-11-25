import { Link } from 'react-router-dom'

export default function Hero({ title, subtitle }) {
  return (
    <section className="hero">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="hero-actions">
        <Link to="/" className="btn">
          View Schedule
        </Link>
        <Link to="/book" className="btn btn-outline">
          Book Ticket
        </Link>
      </div>
    </section>
  )
}
