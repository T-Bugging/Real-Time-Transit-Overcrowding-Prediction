import React, { useState, useEffect, useRef } from 'react';
import '../styles/Dashboard.css';
import '../styles/Dashboard.layout.css';

export default function Dashboard() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapInstance = useRef(null);
  const mapInitialized = useRef(false);
  const [showRoutes, setShowRoutes] = useState(true);

  const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882 };

  // Fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/routes');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log('Routes fetched:', data);
        setRoutes(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch routes:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  // Render map once routes are loaded
  useEffect(() => {
    if (loading || !routes.length || mapInitialized.current) return;

    const L = window.L;
    if (!L) {
      console.error('Leaflet library not loaded');
      setError('Leaflet library not loaded');
      return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map container not found');
      return;
    }

    try {
      console.log('Initializing map with', routes.length, 'routes');
      
      // Create map instance
      mapInstance.current = L.map('map', { 
        preferCanvas: true 
      }).setView([NAGPUR_CENTER.lat, NAGPUR_CENTER.lng], 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      // Add routes to map
      routes.forEach(route => {
        if (route.waypoints && route.waypoints.length > 0) {
          // Draw polyline for route
          const polyline = L.polyline(
            route.waypoints.map(wp => [wp[0], wp[1]]),
            {
              color: route.color || '#1a1a1a',
              weight: 4,
              opacity: 0.8,
              dashArray: '5, 5',
            }
          ).addTo(mapInstance.current);

          // Add popup to polyline
          polyline.bindPopup(`<strong>${route.route_id}</strong><br/>${route.name}`);

          // Add markers for waypoints
          route.waypoints.forEach((waypoint, idx) => {
            const marker = L.circleMarker([waypoint[0], waypoint[1]], {
              radius: 5,
              fillColor: route.color || '#1a1a1a',
              color: route.color || '#1a1a1a',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.8,
            }).addTo(mapInstance.current);

            const label = idx === 0 ? '🚩 Start' : idx === route.waypoints.length - 1 ? '🏁 End' : `Stop ${idx}`;
            marker.bindPopup(`<strong>${route.route_id} - ${label}</strong>`);
          });
        }
      });

      // Handle window resize
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
          console.log('Map size invalidated');
        }
      }, 100);

      mapInitialized.current = true;
      console.log('Map initialized successfully');

    } catch (err) {
      console.error('Map rendering error:', err);
      setError(`Map rendering failed: ${err.message}`);
    }
  }, [loading, routes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        mapInitialized.current = false;
      }
    };
  }, []);

  // Focus map on a specific route
  const focusOnRoute = (route) => {
    if (!mapInstance.current || !route || !route.waypoints) return;
    try {
      const latlngs = route.waypoints.map(wp => [wp[0], wp[1]]);
      mapInstance.current.fitBounds(latlngs, { padding: [40, 40] });
    } catch (err) {
      console.error('Focus route error', err);
    }
  };

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>📍 Live Bus Routes</h1>
          <p className="subtitle">Real-time route visualization across Nagpur</p>
        </div>
        <div className="map-wrapper">
          <div className="loading-spinner">
            <p style={{ color: '#ff7875' }}>⚠️ Error Loading Map</p>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '10px', maxWidth: '400px' }}>
              {error}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '10px' }}>
              Make sure the backend API is running on http://localhost:5000
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>📍 Live Bus Routes</h1>
          <p className="subtitle">Real-time route visualization across Nagpur</p>
        </div>
        <div className="map-wrapper">
          <div className="loading-spinner">
            <p>Loading routes and map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📍 Live Bus Routes</h1>
        <p className="subtitle">Real-time route visualization across Nagpur</p>
      </div>

      <div className="dashboard-grid">
        <div className="top-row">
          <div className="left-column">
            <div className="map-panel">
              <div id="map" className="dashboard-map"></div>
            </div>
          </div>

          <div className="right-column">
            <div className={`routes-panel ${showRoutes ? 'expanded' : 'collapsed'}`}>
              <div className="routes-header">
                <h3>📋 Routes ({routes.length})</h3>
                <button
                  className="routes-toggle"
                  onClick={() => setShowRoutes(s => !s)}
                  aria-expanded={showRoutes}
                >
                  {showRoutes ? 'Hide' : 'Show'}
                </button>
              </div>

              {showRoutes && (
                <div className="routes-tab">
                  <div className="legend-items">
                    {routes.map(route => (
                      <div key={route.route_id} className="legend-item" onClick={() => focusOnRoute(route)}>
                        <div
                          className="legend-color"
                          style={{ backgroundColor: route.color || 'var(--accent)' }}
                        ></div>
                        <div className="legend-info">
                          <strong>{route.route_id}</strong>
                          <span className="route-name">{route.name}</span>
                          <span className="route-hours">{route.operating_hours[0]}:00 - {route.operating_hours[1]}:00</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
