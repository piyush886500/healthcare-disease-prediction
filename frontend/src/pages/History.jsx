import { useEffect, useState } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'

function formatLabel(text) {
  return text ? text.replace(/_/g, ' ') : text
}

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .get('/api/history')
      .then((res) => setHistory(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div className="panel-title">Recent Checks (last 5)</div>

        {loading && <p className="empty-note">Loading…</p>}

        {!loading && history.length === 0 && (
          <div className="empty-state">No checks recorded yet. Run a symptom check to see it here.</div>
        )}

        {/* Backend already returns newest-first, ordered straight from the DB */}
        {!loading &&
          history.map((item, i) => (
            <div className="history-row" key={i}>
              <div>
                <div className="history-disease">{formatLabel(item.disease)}</div>
                <div className="history-symptoms">
                  {(item.symptoms || []).map(formatLabel).join(', ')}
                </div>
                {item.created_at && (
                  <div className="history-symptoms">{item.created_at}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="history-confidence">{item.confidence}%</div>
                <div className="history-symptoms">{item.doctor}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}