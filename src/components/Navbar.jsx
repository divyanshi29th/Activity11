import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Navbar({ onShowToast }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, claims, user, signOut } = useAuth()
  const navigate = useNavigate()

  const userEmail = user?.email || claims?.email || ''

  const handleLinkClick = () => {
    setIsMenuOpen(false)
  }

  const handleSignOut = async () => {
    setIsMenuOpen(false)
    const { error } = await signOut()
    if (error) {
      onShowToast?.(`Sign out failed: ${error.message}`)
      return
    }
    onShowToast?.('Signed out successfully.')
    navigate('/')
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="brand" onClick={handleLinkClick}>
        IPL Ticket Booking 2026
      </NavLink>
      <button
        type="button"
        className="menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        &#9776;
      </button>
      <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
        <NavLink to="/" end onClick={handleLinkClick}>
          Matches
        </NavLink>
        <NavLink to="/book" onClick={handleLinkClick}>
          Book Ticket
        </NavLink>
        <NavLink to="/my-bookings" onClick={handleLinkClick}>
          My Bookings
        </NavLink>

        {isAuthenticated ? (
          <div className="nav-auth-group">
            {userEmail && <span className="nav-user-email">{userEmail}</span>}
            <button type="button" className="btn-small nav-auth-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="nav-login-link" onClick={handleLinkClick}>
            Sign In
          </NavLink>
        )}
      </nav>
    </header>
  )
}
