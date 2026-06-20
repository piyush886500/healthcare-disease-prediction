import { useEffect, useState } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'
import SymptomSelector from '../components/SymptomSelector'
import ResultPanel from '../components/ResultPanel'

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState([])
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loadingSymptoms, setLoadingSymptoms] = useState(true)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    client
      .get('/api/symptoms')
      .then((res) => setSymptoms(res.data.symptoms))
      .finally(() => setLoadingSymptoms(false))
  }, [])

  const toggleSymptom = (symptom) => {
    setSelected((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    )
  }

  const runCheck = async () => {
    if (selected.length === 0) {
      setResult({ error: 'No symptoms provided' })
      return
    }
    setPredicting(true)
    try {
      const res = await client.post('/api/predict', { symptoms: selected })
      setResult(res.data)

      if (!res.data.error) {
        // Mirrors the original frontend behavior of logging each successful
        // prediction to the in-memory /history endpoint.
        client.post('/api/history', {
          symptoms: selected,
          disease: res.data.disease,
          confidence: res.data.confidence,
          doctor: res.data.doctor,
        })
      }
    } catch {
      setResult({ error: 'Something went wrong while predicting. Please try again.' })
    } finally {
      setPredicting(false)
    }
  }

  const clearAll = () => {
    setSelected([])
    setResult(null)
  }

  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="checker-grid">
        <div className="panel">
          <div className="panel-title">Select Symptoms</div>
          {loadingSymptoms ? (
            <p className="empty-note">Loading symptom list…</p>
          ) : (
            <SymptomSelector symptoms={symptoms} selected={selected} onToggle={toggleSymptom} />
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              className="btn btn-primary"
              onClick={runCheck}
              disabled={predicting || selected.length === 0}
            >
              {predicting ? 'Checking…' : 'Check symptoms'}
            </button>
            <button className="btn btn-ghost" onClick={clearAll} type="button">
              Clear
            </button>
          </div>
        </div>

        <ResultPanel result={result} />
      </div>
    </div>
  )
}
