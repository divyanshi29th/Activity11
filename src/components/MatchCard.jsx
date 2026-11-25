export default function MatchCard({ match, onSelectMatch }) {
  const { match_number, teams, date, venue, prices, available_seats } = match
  const isSoldOut = available_seats <= 0

  return (
    <article className="match-card">
      <div className="match-info">
        <div className="match-card-header">
          <span className="match-badge">{match_number}</span>
          <span className={`seats-badge ${isSoldOut ? 'sold-out' : ''}`}>
            {isSoldOut ? 'Sold Out' : `${available_seats} seats left`}
          </span>
        </div>
        <h3>{teams}</h3>
        <p>
          {date} &bull; {venue}
        </p>
        <p className="price-line">
          General: ₹{prices?.General ?? 0} | Premium: ₹{prices?.Premium ?? 0} | VIP: ₹
          {prices?.VIP ?? 0}
        </p>
      </div>
      <button
        type="button"
        className="btn-small"
        disabled={isSoldOut}
        onClick={() => onSelectMatch(match)}
      >
        {isSoldOut ? 'Sold Out' : 'Book Ticket'}
      </button>
    </article>
  )
}
