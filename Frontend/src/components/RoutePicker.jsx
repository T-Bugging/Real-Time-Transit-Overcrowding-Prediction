import React, { useState, useEffect } from 'react';
import { createTicketAndPredict, getRoutes } from '../api/mockApi';
import '../styles/RoutePicker.css';

export default function RoutePicker() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');

  // Fetch routes on mount
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await getRoutes();
        setRoutes(Object.entries(data).map(([id, route]) => ({ id, ...route })));
        if (Object.keys(data).length > 0) {
          setSelectedRoute(Object.keys(data)[0]);
        }
      } catch (err) {
        console.error('Failed to fetch routes:', err);
        setError('Failed to load routes');
      }
    };
    fetchRoutes();
  }, []);

  const handleGenerateTicket = async () => {
    if (!selectedRoute) {
      setError('Please select a route');
      return;
    }

    setLoading(true);
    setError('');
    setTicket(null);
    setPrediction(null);

    try {
      const result = await createTicketAndPredict(selectedRoute);
      setTicket(result.ticket);
      setPrediction(result.prediction);
    } catch (err) {
      console.error('Error generating ticket:', err);
      setError(err.message || 'Failed to generate ticket');
    } finally {
      setLoading(false);
    }
  };

  const currentRoute = selectedRoute && routes.find(r => r.id === selectedRoute);

  return (
    <div className="route-picker-container">
      <h2>Generate Bus Ticket</h2>

      <div className="route-selector">
        <label htmlFor="route-select">Select Route:</label>
        <select
          id="route-select"
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          disabled={loading || routes.length === 0}
        >
          <option value="">-- Choose a route --</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.id} - {route.name}
            </option>
          ))}
        </select>
      </div>

      {currentRoute && (
        <div className="route-info">
          <h4>{currentRoute.name}</h4>
          <p><strong>Operating Hours:</strong> {currentRoute.operating_hours[0]}:00 - {currentRoute.operating_hours[1]}:00</p>
          <p><strong>Vehicles:</strong> {currentRoute.vehicles.join(', ')}</p>
          <p><strong>Days:</strong> {currentRoute.days}</p>
        </div>
      )}

      <button
        onClick={handleGenerateTicket}
        disabled={!selectedRoute || loading}
        className="btn-generate"
      >
        {loading ? 'Generating...' : 'Generate Ticket & Predict'}
      </button>

      {error && <div className="error-message">{error}</div>}

      {ticket && (
        <div className="ticket-result">
          <h3>Ticket Generated ✓</h3>
          <div className="ticket-details">
            <p><strong>Ticket ID:</strong> {ticket.ticket_id}</p>
            <p><strong>Route:</strong> {ticket.route_id}</p>
            <p><strong>Vehicle:</strong> {ticket.vehicle_id}</p>
            <p><strong>Purchase Time:</strong> {new Date(ticket.purchase_datetime).toLocaleString()}</p>
            <p><strong>Fare:</strong> ${ticket.fare.toFixed(2)}</p>
          </div>

          <h3>Occupancy Prediction</h3>
          <div className="prediction-result">
            <div className="occupancy-bar">
              <div
                className={`occupancy-fill ${prediction.crowd_level.toLowerCase()}`}
                style={{ width: `${prediction.occupancy_percentage}%` }}
              ></div>
            </div>
            <p><strong>Occupancy:</strong> {prediction.occupancy_percentage.toFixed(2)}%</p>
            <p className={`crowd-level ${prediction.crowd_level.toLowerCase()}`}>
              <strong>Crowd Level:</strong> {prediction.crowd_level}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
