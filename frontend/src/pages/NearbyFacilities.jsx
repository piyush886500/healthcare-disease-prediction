/**
 * NearbyFacilities.jsx — Improved nearby facility search.
 * - GPS auto-detect with Haversine distance sorting
 * - Pincode fallback search
 * - Deduplication, open/closed status, distance labels
 * - Loading skeleton, error, retry, empty states
 * - Report Incorrect Results button (mailto: with pre-filled device/location info)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'

const APP_VERSION = '1.0.0'
const REPORT_EMAIL = 'piyush822494@gmail.com'
const SEARCH_RADIUS_M = 5000

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'hospital', label: 'Hospitals',    icon: '🏥', osmVal: 'hospital'    },
  { id: 'clinic',   label: 'Clinics',      icon: '🏨', osmVal: 'clinic'      },
  { id: 'pharmacy', label: 'Pharmacies',   icon: '💊', osmVal: 'pharmacy'    },
  { id: 'doctor',   label: 'Doctors',      icon: '👨‍⚕️', osmVal: 'doctors'     },
  { id: 'dentist',  label: 'Dentists',     icon: '🦷', osmVal: 'dentist'     },
  { id: 'lab',      label: 'Diag. Labs',   icon: '🔬', osmVal: 'laboratory'  },
]

// ── Haversine formula ─────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtDist(km) {
  if (km < 0.1) return `${Math.round(km * 1000)} m away`
  if (km < 1)   return `${(km * 1000).toFixed(0)} m away`
  if (km < 10)  return `${km.toFixed(1)} km away`
  return `${km.toFixed(0)} km away`
}

// ── Dedup by place_id or name+address ────────────────────────────────────────
function dedup(list) {
  const seen = new Map()
  for (const f of list) {
    const key = f.place_id || `${f.name}||${f.address}`
    if (!seen.has(key) || f.distance < seen.get(key).distance) seen.set(key, f)
  }
  return Array.from(seen.values()).sort((a, b) => a.distance - b.distance)
}

// ── Overpass API query ────────────────────────────────────────────────────────
async function queryOverpass(lat, lon, osmVal) {
  const q = `[out:json][timeout:15];(node["amenity"="${osmVal}"](around:${SEARCH_RADIUS_M},${lat},${lon});way["amenity"="${osmVal}"](around:${SEARCH_RADIUS_M},${lat},${lon}););out center tags;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(q)}`,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const data = await res.json()
  return (data.elements || [])
    .map(el => {
      const elLat = el.lat ?? el.center?.lat
      const elLon = el.lon ?? el.center?.lon
      if (!elLat || !elLon) return null
      const tags = el.tags || {}
      const dist = haversine(lat, lon, elLat, elLon)
      const addr = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
        .filter(Boolean).join(', ') || tags['addr:full'] || 'Address not available'
      return {
        place_id:      `osm-${el.id}`,
        name:          tags.name || tags['name:en'] || 'Unnamed',
        address:       addr,
        phone:         tags.phone || tags['contact:phone'] || null,
        website:       tags.website || tags['contact:website'] || null,
        opening_hours: tags.opening_hours || null,
        isOpen:        parseOpen(tags.opening_hours),
        lat: elLat, lon: elLon,
        distance:      dist,
        distanceLabel: fmtDist(dist),
      }
    })
    .filter(Boolean)
}

function parseOpen(hours) {
  if (!hours) return null
  if (hours === '24/7') return true
  try {
    const day = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date().getDay()]
    const m = hours.match(new RegExp(`${day}\\s+(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`))
    if (!m) return null
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    const mins = t => { const [h, mn] = t.split(':'); return +h * 60 + +mn }
    return now >= mins(m[1]) && now <= mins(m[2])
  } catch { return null }
}

// ── Pincode → coords via Nominatim ───────────────────────────────────────────
async function pincodeToCoords(pincode) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pincode)}&country=India&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  const data = await res.json()
  if (!data.length) throw new Error('Pincode not found. Please check and try again.')
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), city: data[0].display_name.split(',')[0] }
}

// ── Report mailto builder ─────────────────────────────────────────────────────
function buildMailto({ lat, lon, city, category }) {
  const ua = navigator.userAgent
  const os = /Windows NT 10/.test(ua) ? 'Windows 10/11'
    : /Mac OS X ([\d_]+)/.test(ua) ? `macOS ${ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g,'.')}`
    : /Android ([\d.]+)/.test(ua) ? `Android ${ua.match(/Android ([\d.]+)/)[1]}`
    : /iPhone OS ([\d_]+)/.test(ua) ? `iOS ${ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g,'.')}`
    : 'Unknown OS'
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? (() => { const m = ua.match(/\(Linux; Android [\d.]+; (.+?)\)/); return m ? m[1] : 'Android' })()
    : 'Desktop'

  const body = `Nearby Facilities Issue Report
${'─'.repeat(40)}

Problem Description:
[Please describe the issue here]

─── Location ───────────────────────
Latitude:   ${lat ?? 'Permission denied'}
Longitude:  ${lon ?? 'Permission denied'}
City:       ${city || 'Unknown'}

─── App Context ────────────────────
Selected Category: ${category || 'None'}
App Version:       ${APP_VERSION}

─── Expected vs Actual ─────────────
Expected Result:
[What should have appeared]

Actual Result:
[What actually appeared]

─── Device Info ────────────────────
Device:     ${device}
OS Version: ${os}
Timestamp:  ${new Date().toISOString()}
`
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent('Nearby Facilities Issue Report')}&body=${encodeURIComponent(body)}`
}

// ── In-memory cache ───────────────────────────────────────────────────────────
const facilityCache = {}
function cacheKey(cat, lat, lon) { return `${cat}-${lat.toFixed(3)}-${lon.toFixed(3)}` }

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function NearbyFacilities() {
  const [pincode,    setPincode]    = useState('')
  const [facilities, setFacilities] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [locating,   setLocating]   = useState(false)
  const [error,      setError]      = useState('')
  const [category,   setCategory]   = useState('hospital')
  const [location,   setLocation]   = useState(null)   // { lat, lon, city }
  const [reportSent, setReportSent] = useState(false)
  const abortRef = useRef(null)

  // ── Fetch facilities for given coords + category ──────────────────────────
  const fetchFacilities = useCallback(async (loc, cat, force = false) => {
    const key = cacheKey(cat, loc.lat, loc.lon)
    if (!force && facilityCache[key]) { setFacilities(facilityCache[key]); return }

    setLoading(true)
    setError('')
    setFacilities(null)

    const catObj = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0]
    try {
      let results
      try {
        results = await queryOverpass(loc.lat, loc.lon, catObj.osmVal)
      } catch {
        // Fallback: try backend API
        try {
          const res = await client.get('/api/nearby-facilities', {
            params: { lat: loc.lat, lon: loc.lon, type: cat }
          })
          results = (res.data?.facilities || []).map(f => ({
            ...f,
            distance:      f.distance_km ?? haversine(loc.lat, loc.lon, f.lat ?? 0, f.lon ?? 0),
            distanceLabel: fmtDist(f.distance_km ?? 0),
            isOpen:        null,
          }))
        } catch {
          results = []
        }
      }

      const final = dedup(results)
      facilityCache[key] = final
      setFacilities(final)
      if (final.length === 0) setError(`No ${catObj.label} found within 5 km of your location.`)
    } catch (err) {
      setError(err.message || 'Failed to load facilities. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── GPS auto-detect ───────────────────────────────────────────────────────
  const detectGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enter a pincode instead.')
      return
    }
    setLocating(true)
    setError('')
    setFacilities(null)

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat  = pos.coords.latitude
        const lon  = pos.coords.longitude
        // Reverse geocode city
        let city = 'Your Location'
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } })
          const d = await r.json()
          city = d.address?.city || d.address?.town || d.address?.village || 'Your Location'
        } catch {}
        const loc = { lat, lon, city }
        setLocation(loc)
        setLocating(false)
        fetchFacilities(loc, category)
      },
      err => {
        setLocating(false)
        const msgs = {
          1: 'Location permission denied. Please allow location access or enter a pincode.',
          2: 'Your location could not be determined. Please enter a pincode.',
          3: 'Location request timed out. Please try again or enter a pincode.',
        }
        setError(msgs[err.code] || 'Could not get your location.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [category, fetchFacilities])

  // ── Auto-detect on mount ──────────────────────────────────────────────────
  useEffect(() => { detectGPS() }, []) // eslint-disable-line

  // ── Category change ───────────────────────────────────────────────────────
  const changeCategory = cat => {
    setCategory(cat)
    if (location) fetchFacilities(location, cat)
  }

  // ── Pincode search ────────────────────────────────────────────────────────
  const handlePincodeSearch = async e => {
    e.preventDefault()
    setError('')
    setFacilities(null)
    setLocating(true)
    try {
      const loc = await pincodeToCoords(pincode)
      setLocation(loc)
      setLocating(false)
      fetchFacilities(loc, category)
    } catch (err) {
      setLocating(false)
      setError(err.message)
    }
  }

  // ── Report button ─────────────────────────────────────────────────────────
  const handleReport = () => {
    const catObj = CATEGORIES.find(c => c.id === category)
    window.location.href = buildMailto({
      lat:      location?.lat,
      lon:      location?.lon,
      city:     location?.city,
      category: catObj?.label,
    })
    setReportSent(true)
    setTimeout(() => setReportSent(false), 3000)
  }

  const catObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]
  const isBusy = loading || locating

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          <div>
            <div className="panel-title" style={{ marginBottom: 4 }}>Nearby Clinics &amp; Hospitals</div>
            {/* Location pill */}
            <div style={{ fontSize: 13, color: 'var(--text-muted, #6B7280)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {locating
                ? <><SpinnerInline /> Detecting location…</>
                : location
                  ? <>📍 {location.city} · {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</>
                  : <>📍 Location not detected</>
              }
            </div>
          </div>

          {/* Report button */}
          <button
            onClick={handleReport}
            title="Report incorrect or missing results"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 50,
              border: '1.5px solid #FCA5A5', background: 'white',
              color: '#DC2626', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', transition: 'background 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            ⚑ {reportSent ? 'Email client opened!' : 'Report Incorrect Results'}
          </button>
        </div>

        {/* ── Category tabs ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 50, border: '1.5px solid',
                borderColor: cat.id === category ? 'var(--primary, #3B4DB8)' : 'var(--line-strong, #DDE3FF)',
                background: cat.id === category ? 'var(--primary, #3B4DB8)' : 'white',
                color: cat.id === category ? 'white' : 'inherit',
                fontWeight: cat.id === category ? 600 : 400,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              <span>{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>

        {/* ── Search controls ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* GPS button */}
          <button
            className="btn btn-primary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={detectGPS}
            disabled={isBusy}
          >
            {locating ? <><SpinnerInline color="white" /> Locating…</> : '📍 Use My Location'}
          </button>

          {/* Pincode fallback */}
          <form onSubmit={handlePincodeSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Or enter pincode e.g. 110001"
              value={pincode}
              onChange={e => setPincode(e.target.value)}
              style={{ flex: 1, padding: '10px 13px', borderRadius: 8, border: '1px solid var(--line-strong, #DDE3FF)', fontFamily: 'inherit', fontSize: 14 }}
            />
            <button className="btn btn-primary" style={{ width: 'auto' }} disabled={isBusy || !pincode}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>

        {/* ── Results count ─────────────────────────────────────────── */}
        {facilities && facilities.length > 0 && !loading && (
          <div style={{ fontSize: 13, color: 'var(--text-muted, #6B7280)', marginBottom: 12 }}>
            {catObj.icon} <strong>{facilities.length}</strong> {catObj.label} found · sorted by distance
            <button
              onClick={() => location && fetchFacilities(location, category, true)}
              style={{ marginLeft: 12, background: 'none', border: 'none', color: 'var(--primary, #3B4DB8)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
            >
              Refresh
            </button>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && !loading && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#DC2626', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span>⚠️ {error}</span>
            <button
              onClick={detectGPS}
              style={{ flexShrink: 0, background: '#DC2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────── */}
        {isBusy && (
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} className="history-row" style={{ opacity: 0.5 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, background: 'var(--line-strong, #DDE3FF)', borderRadius: 6, marginBottom: 8, width: '60%', animation: `shimmer 1.5s infinite ${i * 0.2}s` }} />
                  <div style={{ height: 12, background: 'var(--line-strong, #DDE3FF)', borderRadius: 6, width: '80%', animation: `shimmer 1.5s infinite ${i * 0.3}s` }} />
                </div>
                <div style={{ width: 60, height: 14, background: 'var(--line-strong, #DDE3FF)', borderRadius: 6, animation: `shimmer 1.5s infinite` }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────── */}
        {!isBusy && facilities && facilities.length === 0 && !error && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No {catObj.label} found within 5 km</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #6B7280)' }}>Try a different category or search by pincode.</div>
          </div>
        )}

        {/* ── Facility cards ─────────────────────────────────────────── */}
        {!isBusy && facilities && facilities.map((f, i) => {
          const openStatus =
            f.isOpen === true  ? { label: 'Open',     color: '#16A34A', bg: '#DCFCE7' } :
            f.isOpen === false ? { label: 'Closed',   color: '#DC2626', bg: '#FEE2E2' } :
                                 { label: 'Hours N/A',color: '#6B7280', bg: '#F3F4F6' }
          return (
            <div className="history-row" key={f.place_id || i} style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name + category icon */}
                <div className="history-disease" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{catObj.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </div>

                {/* Address */}
                <div className="history-symptoms">{f.address}</div>

                {/* Phone */}
                {f.phone && (
                  <div className="history-symptoms">
                    <a href={`tel:${f.phone}`} style={{ color: 'var(--primary, #3B4DB8)', textDecoration: 'none' }}>
                      📞 {f.phone}
                    </a>
                  </div>
                )}

                {/* Action links */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--primary, #3B4DB8)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    🗺️ Directions
                  </a>
                  {f.website && (
                    <a
                      href={f.website}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--primary, #3B4DB8)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🌐 Website
                    </a>
                  )}
                </div>
              </div>

              {/* Right side — distance + open status */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="history-confidence" style={{ marginBottom: 4 }}>
                  📍 {f.distanceLabel || `${f.distance_km} km`}
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 50,
                  fontSize: 11, fontWeight: 600,
                  background: openStatus.bg, color: openStatus.color,
                }}>
                  {openStatus.label}
                </span>
                {f.opening_hours === '24/7' && (
                  <div style={{ fontSize: 11, color: '#16A34A', marginTop: 3 }}>24 / 7</div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Bottom report section ──────────────────────────────────── */}
        {facilities && facilities.length > 0 && !isBusy && (
          <div style={{
            marginTop: 20, padding: '14px 16px', borderRadius: 12,
            background: '#FFF7F7', border: '1px solid #FCA5A5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1F4B', marginBottom: 2 }}>
                Results incorrect or missing?
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Help us improve by reporting wrong or missing facilities.
              </div>
            </div>
            <button
              onClick={handleReport}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 50,
                border: '1.5px solid #FCA5A5', background: 'white',
                color: '#DC2626', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'background 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              ⚑ Report Incorrect Results
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 1;   }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ── Inline spinner ────────────────────────────────────────────────────────────
function SpinnerInline({ color = 'var(--primary, #3B4DB8)', size = 14 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}40`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}
