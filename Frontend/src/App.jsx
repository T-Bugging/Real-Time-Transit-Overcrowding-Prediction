import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import TicketBooking from './components/TicketBooking'
import TicketLookup from './components/TicketLookup'
import AdminDashboard from './components/AdminDashboard'

export default function App() {
  const [activePage, setActivePage] = useState('home')

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Dashboard />
      case 'admin':
        return <AdminDashboard />
      case 'book':
        return <TicketBooking />
      case 'lookup':
        return <TicketLookup />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setActivePage('home')}>
          <div className="logo">RT</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Real Time Transit</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Overcrowding Prediction</div>
          </div>
        </div>
        <nav className="nav">
          <a
            className={activePage === 'home' ? 'active' : ''}
            onClick={() => setActivePage('home')}
            style={{ cursor: 'pointer' }}
          >
            🗺️ Routes
          </a>
          <a
            className={activePage === 'book' ? 'active' : ''}
            onClick={() => setActivePage('book')}
            style={{ cursor: 'pointer' }}
          >
            🎫 Book Ticket
          </a>
          <a
            className={activePage === 'lookup' ? 'active' : ''}
            onClick={() => setActivePage('lookup')}
            style={{ cursor: 'pointer' }}
          >
            🔍 Check Ticket
          </a>
          <a
            className={activePage === 'admin' ? 'active' : ''}
            onClick={() => setActivePage('admin')}
            style={{ cursor: 'pointer' }}
          >
            ⚙️ Admin
          </a>
        </nav>
      </header>
      <main>
        {renderPage()}
      </main>
    </div>
  )
}
