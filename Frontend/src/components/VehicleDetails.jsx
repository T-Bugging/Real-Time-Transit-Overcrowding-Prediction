import React, { useEffect, useState } from 'react'
import { fetchVehicleById, fetchVehicleForecast } from '../api/mockApi'

export default function VehicleDetails({ vehicleId, onClose }) {
  const [vehicle, setVehicle] = useState(null)
  const [forecast, setForecast] = useState([])

  useEffect(() => {
    if (!vehicleId) return
    fetchVehicleById(vehicleId).then(setVehicle)
    fetchVehicleForecast(vehicleId, 15).then((f) => setForecast(f))
  }, [vehicleId])

  if (!vehicleId) return null

  return (
    <div style={{ padding: 12 }}>
      <button onClick={onClose}>Back</button>
      {!vehicle ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3>Vehicle {vehicle.vehicle_id} — {vehicle.route_id}</h3>
          <div>Current stop: {vehicle.next_stop?.name || 'Unknown'}</div>
          <div>Current occupancy: {vehicle.occupancy_percentage}%</div>
          <h4>Forecast</h4>
          <ul>
            {forecast.map((f, i) => (
              <li key={i}>{f.minutes_ahead} min — {f.occupancy_percentage}% ({f.crowd_level})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
