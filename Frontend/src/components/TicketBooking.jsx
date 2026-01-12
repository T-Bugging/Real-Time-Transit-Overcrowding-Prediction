import React, { useState, useEffect } from 'react';
import '../styles/TicketBooking.css';
import { createTicketAndPredict, getRoutes } from '../api/mockApi';

export default function TicketBooking() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [fare, setFare] = useState(50);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedTicket, setBookedTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const routesData = await getRoutes();
        setRoutes(routesData);
        if (routesData.length > 0) {
          setSelectedRoute(routesData[0].route_id);
        }
      } catch (err) {
        setError('Failed to fetch routes');
        console.error(err);
      }
    };
    fetchRoutes();
  }, []);

  const handleBookTicket = async (e) => {
    e.preventDefault();
    if (!selectedRoute) {
      setError('Please select a route');
      return;
    }

    setLoading(true);
    setError('');
    setBookedTicket(null);

      try {
      // Build overrides object for user-selected time preferences
      const overrides = {};
      if (selectedTimeSlot) {
        overrides.time_slot = selectedTimeSlot;
      }

      const result = await createTicketAndPredict(selectedRoute, parseFloat(fare), overrides);
      // Flask returns { ticket, prediction } — keep only the ticket info for booking confirmation
      setBookedTicket(result.ticket);
    } catch (err) {
      setError(err.message || 'Failed to book ticket');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentRoute = routes.find(r => r.route_id === selectedRoute);

  return (
    <div className="ticket-booking-page">
      <div className="booking-container">
        <div className="booking-form-section">
          <h1>Book Your Ticket</h1>
          
          <form onSubmit={handleBookTicket} className="booking-form">
            <div className="form-group">
              <label htmlFor="route">Select Route</label>
              <select
                id="route"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Choose a route --</option>
                {routes.map(route => (
                  <option key={route.route_id} value={route.route_id}>
                    {route.route_id} - {route.name}
                  </option>
                ))}
              </select>
            </div>

            {currentRoute && (
              <div className="route-info">
                <div className="info-row">
                  <span className="label">Operating Hours:</span>
                  <span className="value">
                    {currentRoute.operating_hours[0]}:00 - {currentRoute.operating_hours[1]}:00
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Available Days:</span>
                  <span className="value">{currentRoute.days}</span>
                </div>
                <div className="info-row">
                  <span className="label">Vehicles:</span>
                  <span className="value">{currentRoute.vehicles.join(', ')}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="timeSlot">Preferred Time Slot (Optional)</label>
              <select
                id="timeSlot"
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Any time slot --</option>
                <option value="Morning">Morning (5:00 - 11:00)</option>
                <option value="Midday">Midday (11:00 - 15:00)</option>
                <option value="Evening">Evening (15:00 - 20:00)</option>
                <option value="Night">Night (20:00 - 5:00)</option>
              </select>
            </div>



            <div className="form-group">
              <label htmlFor="fare">Fare Amount (₹)</label>
              <input
                id="fare"
                type="number"
                min="10"
                max="200"
                step="5"
                value={fare}
                onChange={(e) => setFare(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-book"
              disabled={loading || !selectedRoute}
            >
              {loading ? 'Booking...' : 'Book Ticket'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>

        {bookedTicket && (
          <div className="booking-confirmation">
            <div className="confirmation-header">
              <h2>✓ Ticket Booked Successfully</h2>
            </div>

            <div className="ticket-details">
              <div className="detail-item">
                <span className="detail-label">Ticket ID</span>
                <span className="detail-value ticket-id">{bookedTicket.ticket_id}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Route</span>
                <span className="detail-value">
                  {bookedTicket.route_id} - {currentRoute?.name}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Travel Date & Time</span>
                <span className="detail-value">
                  {new Date(bookedTicket.purchase_datetime).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Fare</span>
                <span className="detail-value">₹{bookedTicket.fare}</span>
              </div>

              <div className="divider"></div>
            </div>

            <button
              className="btn-new-ticket"
              onClick={() => {
                setBookedTicket(null);
                setSelectedRoute(routes[0]?.route_id || '');
                setFare(50);
                setSelectedTimeSlot('');
              }}
            >
              Book Another Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
