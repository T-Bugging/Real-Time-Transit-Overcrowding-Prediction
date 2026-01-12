import React, { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vehicleInputs, setVehicleInputs] = useState({})
  const [forecasts, setForecasts] = useState({})

  useEffect(() => {
    fetchRoutes()
  }, [])

  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes')
      const data = await res.json()
      setRoutes(data)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const handleAddVehicle = async (route_id) => {
    const vehicle_id = (vehicleInputs[route_id] || '').trim()
    if (!vehicle_id) return alert('Enter vehicle id')

    try {
      const res = await fetch(`/api/routes/${route_id}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      // refresh routes
      fetchRoutes()
      setVehicleInputs({ ...vehicleInputs, [route_id]: '' })
      alert('Vehicle added')
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const handleForecast = async (route_id) => {
    try {
      const res = await fetch(`/api/routes/${route_id}/forecast`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setForecasts({ ...forecasts, [route_id]: data.forecasts })
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20, color: 'salmon' }}>{error}</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard — Manage External Vehicles</h2>
      <p style={{ color: 'var(--muted)' }}>Add external vehicles to a route and fetch short-term forecasts.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
        {routes.map(route => (
          <div key={route.route_id} className="panel-card admin-route-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{route.name} <small style={{ color: 'var(--muted)' }}>({route.route_id})</small></strong>
                <div style={{ color: 'var(--muted)', marginTop: 6 }}>Vehicles: {route.vehicles ? route.vehicles.length : 0}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Vehicle ID" value={vehicleInputs[route.route_id] || ''} onChange={e => setVehicleInputs({ ...vehicleInputs, [route.route_id]: e.target.value })} />
                <button className="primary" onClick={() => handleAddVehicle(route.route_id)}>Add Vehicle</button>
                <button onClick={() => handleForecast(route.route_id)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--muted)', padding: '8px 12px', borderRadius: 8 }}>Forecast</button>
              </div>
            </div>

            {forecasts[route.route_id] && (
              <div style={{ marginTop: 12 }}>
                <div>Now: {forecasts[route.route_id].now.crowd_level} — {forecasts[route.route_id].now.occupancy_percentage}%</div>
                <div>15 min: {forecasts[route.route_id]['15_min'].crowd_level} — {forecasts[route.route_id]['15_min'].occupancy_percentage}%</div>
                <div>30 min: {forecasts[route.route_id]['30_min'].crowd_level} — {forecasts[route.route_id]['30_min'].occupancy_percentage}%</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
