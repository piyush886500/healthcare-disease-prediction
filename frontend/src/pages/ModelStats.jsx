import { useEffect, useState } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'

export default function ModelStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    client.get('/api/model-stats').then((res) => setStats(res.data))
  }, [])

  return (
    <div className="chart-shell">
      <ChartHeader />

      {!stats && <p className="empty-note">Loading model stats…</p>}

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="big">{stats.rf_accuracy}%</div>
              <div className="label">Random Forest accuracy</div>
            </div>
            <div className="stat-card">
              <div className="big">{stats.dt_accuracy}%</div>
              <div className="label">Decision Tree accuracy</div>
            </div>
            <div className="stat-card">
              <div className="big">{stats.training_samples}</div>
              <div className="label">Training samples</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              Dataset — {stats.total_diseases} diseases · {stats.total_symptoms} symptoms
            </div>

            <div className="result-section-label" style={{ marginTop: 0 }}>
              Top 10 most influential symptoms
            </div>
            {stats.top_symptoms.map((s) => (
              <div className="bar-row" key={s.symptom}>
                <span>{s.symptom}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.min(100, s.importance * 8)}%` }}
                  />
                </div>
                <span className="bar-value">{s.importance}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
