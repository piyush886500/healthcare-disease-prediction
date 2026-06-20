function formatLabel(text) {
  return text.replace(/_/g, ' ')
}

export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="panel">
        <div className="panel-title">Result</div>
        <div className="empty-state">
          Select your symptoms on the left, then run the check to see a result here.
        </div>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="panel">
        <div className="panel-title">Result</div>
        <div className="form-error">{result.error}</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-title">Result</div>

      {result.emergency && (
        <div className="emergency-banner">
          ⚠ One or more selected symptoms can indicate a medical emergency. Please seek
          immediate medical attention.
        </div>
      )}

      <div className="result-disease">{formatLabel(result.disease)}</div>

      <div className="result-meta">
        <div>
          <div className="stat-label">Confidence</div>
          <div className="stat-value">{result.confidence}%</div>
        </div>
        <div>
          <div className="stat-label">Refer to</div>
          <div className="stat-value">{result.doctor}</div>
        </div>
      </div>

      <div className="confidence-bar">
        <div className="confidence-bar-fill" style={{ width: `${result.confidence}%` }} />
      </div>

      <div className="result-section-label">Other possibilities</div>
      <ul className="top3-list">
        {result.top3.map(([name, score]) => (
          <li key={name}>
            <span>{formatLabel(name)}</span>
            <span className="score mono">{score}%</span>
          </li>
        ))}
      </ul>

      <div className="result-section-label">About this condition</div>
      <p className="result-description">{result.description}</p>

      {result.precautions?.length > 0 && (
        <>
          <div className="result-section-label">Precautions</div>
          <ul className="precaution-list">
            {result.precautions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
