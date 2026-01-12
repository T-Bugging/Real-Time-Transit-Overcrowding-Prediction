// Real API layer — calls Flask backend endpoints
// Configured via Vite proxy: /api -> http://localhost:5000/api

const API_BASE = '/api'

export async function fetchModelStatus() {
  const res = await fetch(`${API_BASE}/model/status`)
  if (!res.ok) throw new Error('Failed to fetch model status')
  return res.json()
}

export async function predictOccupancy(input) {
  // input: { timestamp_hour, timestamp_day_of_week, timestamp_month, day_type, time_slot }
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Prediction failed')
  return res.json()
}

export async function predictBatch(inputs) {
  // inputs: array of input objects
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs)
  })
  if (!res.ok) throw new Error('Batch prediction failed')
  return res.json()
}

export async function createTicketAndPredict(routeId, fare = 0.0, overrides = null) {
  // Creates ticket and returns ticket + prediction
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route_id: routeId, fare, overrides })
  })
  if (!res.ok) throw new Error('Failed to create ticket')
  return res.json()
}

export async function getTicket(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}`)
  if (!res.ok) throw new Error('Ticket not found')
  return res.json()
}

export async function predictForTicket(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/predict`)
  if (!res.ok) throw new Error('Prediction failed')
  return res.json()
}

export async function getRoutes() {
  const res = await fetch(`${API_BASE}/routes`)
  if (!res.ok) throw new Error('Failed to fetch routes')
  return res.json()
}

// Mocked vehicle/route data (keep for now if backend doesn't have these yet)
export async function fetchRoutes() {
  return [
    { route_id: 'R12', name: 'Ring Road', stops: [], service_frequency: '10m' },
    { route_id: 'R5', name: 'South-North', stops: [], service_frequency: '15m' },
  ]
}

export async function fetchVehiclesWithPredictions() {
  // Mock vehicles with random occupancy (frontend can call predictOccupancy for each)
  const base = { lat: 21.1458, lng: 79.0882 }
  const rnd = (d) => (Math.random() - 0.5) * d
  const vehicles = []
  for (let i = 1; i <= 8; i++) {
    const occupancy = Math.floor(Math.random() * 100)
    vehicles.push({
      vehicle_id: `V${100 + i}`,
      route_id: i % 2 === 0 ? 'R12' : 'R5',
      lat: base.lat + rnd(0.05),
      lng: base.lng + rnd(0.05),
      next_stop: { stop_id: `S${i}`, name: `Stop ${i}` },
      occupancy_percentage: occupancy
    })
  }
  return vehicles
}

export async function fetchVehicleById(vehicle_id) {
  const vehicles = await fetchVehiclesWithPredictions()
  const found = vehicles.find((v) => v.vehicle_id === vehicle_id)
  await new Promise((r) => setTimeout(r, 200))
  return found || null
}

export async function fetchVehicleForecast(vehicle_id, minutesAhead = 15) {
  // Simulate forecast (can be enhanced with real backend endpoint)
  const occupancy = Math.min(100, Math.max(0, Math.round((Math.random() * 80) + 10)))
  await new Promise((r) => setTimeout(r, 200))
  return [{ minutes_ahead: minutesAhead, occupancy_percentage: occupancy, crowd_level: occupancy > 75 ? 'High' : occupancy >= 50 ? 'Medium' : 'Low' }]
}
