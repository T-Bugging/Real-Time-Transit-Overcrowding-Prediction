import React, { useState } from 'react';
import '../styles/TicketLookup.css';
import { getTicket, predictForTicket, getRoutes } from '../api/mockApi';

export default function TicketLookup() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState([]);

  React.useEffect(() => {
    getRoutes().then(setRoutes).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) {
      setError('Please enter a ticket ID');
      return;
    }

    setLoading(true);
    setError('');
    setTicket(null);
    setPrediction(null);

    try {
      const ticketData = await getTicket(ticketId);
      setTicket(ticketData);

      // Fetch prediction for this ticket
      const predictionData = await predictForTicket(ticketId);
      setPrediction(predictionData);
    } catch (err) {
      setError(err.message || 'Ticket not found. Please check the ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentRoute = ticket ? routes.find(r => r.route_id === ticket.route_id) : null;

  return (
    <div className="ticket-lookup-page">
      <div className="lookup-container">
        <div className="lookup-section">
          <h1>Check Your Ticket</h1>
          <p className="subtitle">Enter your ticket ID to view location and crowd prediction</p>

          <form onSubmit={handleSearch} className="lookup-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Enter Ticket ID (e.g., TKT-00001)"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength="20"
              />
              <button
                type="submit"
                className="btn-search"
                disabled={loading || !ticketId.trim()}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>

        {ticket && currentRoute && (
          <div className="lookup-results">
            <div className="ticket-info-card">
              <h2>Ticket Information</h2>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Ticket ID</span>
                  <span className="info-value">{ticket.ticket_id}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Route</span>
                  <span className="info-value">{ticket.route_id}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Route Name</span>
                  <span className="info-value">{currentRoute.name}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Travel Date & Time</span>
                  <span className="info-value">
                    {new Date(ticket.purchase_datetime).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Fare</span>
                  <span className="info-value">₹{ticket.fare}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Day Type</span>
                  <span className="info-value">{ticket.day_type}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Time Slot</span>
                  <span className="info-value">{ticket.time_slot}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Booking Time</span>
                  <span className="info-value">
                    {new Date(ticket.purchase_datetime).toLocaleTimeString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {prediction && (
              <div className="prediction-card">
                <h2>Occupancy Prediction</h2>

                <div className="occupancy-main">
                  <div className="occupancy-percentage-large">
                    {prediction.occupancy_percentage.toFixed(1)}%
                  </div>
                  <div className={`occupancy-level level-${prediction.crowd_level.toLowerCase()}`}>
                    {prediction.crowd_level}
                  </div>
                </div>

                <div className="prediction-message">
                  {prediction.crowd_level === 'High' && (
                    <p>🔴 <strong>Bus Expected to be Heavily Crowded</strong><br/>
                    Expect limited standing space and longer boarding times.</p>
                  )}
                  {prediction.crowd_level === 'Medium' && (
                    <p>🟡 <strong>Bus Expected to be Moderately Crowded</strong><br/>
                    Most seats may be occupied, but standing space available.</p>
                  )}
                  {prediction.crowd_level === 'Low' && (
                    <p>🟢 <strong>Bus Expected to Have Available Seats</strong><br/>
                    Good occupancy level with comfortable travel experience.</p>
                  )}
                </div>

                <div className="route-details">
                  <h3>Route Details</h3>
                  <div className="route-detail-item">
                    <span>Operating Hours:</span>
                    <span className="value">
                      {currentRoute.operating_hours[0]}:00 - {currentRoute.operating_hours[1]}:00
                    </span>
                  </div>
                  <div className="route-detail-item">
                    <span>Available Days:</span>
                    <span className="value">{currentRoute.days}</span>
                  </div>
                  <div className="route-detail-item">
                    <span>Vehicles on Route:</span>
                    <span className="value">{currentRoute.vehicles.join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!ticket && !error && ticketId && !loading && (
          <div className="empty-state">
            <p>Enter a ticket ID and click Search to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
