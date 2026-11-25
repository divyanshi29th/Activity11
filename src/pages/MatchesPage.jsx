import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MatchCard from '../components/MatchCard'

export default function MatchesPage({
  matches,
  loadingMatches,
  realtimeStatus,
  onSelectMatch,
  onShowToast,
}) {
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const navigate = useNavigate()

  const filteredMatches =
    selectedTeam === 'all'
      ? matches
      : matches.filter((match) => match.team_codes.includes(selectedTeam))

  const handleTeamFilterChange = (e) => {
    const team = e.target.value
    setSelectedTeam(team)
    onShowToast(
      team === 'all' ? 'Showing all IPL match cards.' : `Filtered matches for ${team}.`
    )
  }

  const handleBookMatch = (match) => {
    onSelectMatch(match)
    navigate('/book', { state: { preselectedMatch: match.teams } })
  }

  return (
    <>
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
                onShowToast('Switched to Grid View.')
              }}
            >
              Grid View
            </button>
            <button
              type="button"
              className={`btn-small view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('list')
                onShowToast('Switched to List View.')
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
                onSelectMatch={handleBookMatch}
              />
            ))}
          </div>
        )}
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
    </>
  )
}
