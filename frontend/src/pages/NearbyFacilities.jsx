import { useState } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'

export default function NearbyFacilities() {
  const [pincode, setPincode] = useState('')
  const [facilities, setFacilities] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async (e) => {
    e.preventDefault()
    setError('')
    setFacilities(null)
    setLoading(true)
    try {
      const res = await client.get('/api/nearby-facilities', { params: { pincode } })
      setFacilities(res.data.facilities)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not find facilities for that pincode.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div className="panel-title">Nearby Clinics &amp; Hospitals</div>

        <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Enter pincode e.g. 110001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            style={{ flex: 1, padding: '11px 13px', borderRadius: 8, border: '1px solid var(--line-strong)' }}
            required
          />
          <button className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
            {loading ? 'Searching…' : 'Find'}
          </button>
        </form>

        {error && <div className="form-error">{error}</div>}

        {facilities && facilities.length === 0 && (
          <div className="empty-state">No hospitals or clinics found near that pincode.</div>
        )}

        {facilities &&
          facilities.map((f, i) => (
            <div className="history-row" key={i}>
              <div>
                <div className="history-disease">{f.name}</div>
                <div className="history-symptoms">{f.address}</div>
                {f.phone && <div className="history-symptoms">{f.phone}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="history-confidence">{f.distance_km} km</div>
                <div className="history-symptoms" style={{ textTransform: 'capitalize' }}>{f.type}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}