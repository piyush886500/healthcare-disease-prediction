import { useMemo, useState } from 'react'

function formatLabel(symptom) {
  return symptom.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function SymptomSelector({ symptoms, selected, onToggle }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return symptoms
    return symptoms.filter((s) => formatLabel(s).toLowerCase().includes(q))
  }, [symptoms, query])

  return (
    <div>
      <div className="symptom-search">
        <input
          type="text"
          placeholder="Search symptoms… e.g. headache, cough"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="symptom-list">
        {filtered.length === 0 && <p className="empty-note">No symptoms match "{query}".</p>}
        {filtered.map((symptom) => {
          const isSelected = selected.includes(symptom)
          return (
            <button
              key={symptom}
              type="button"
              className={`chip${isSelected ? ' selected' : ''}`}
              onClick={() => onToggle(symptom)}
              aria-pressed={isSelected}
            >
              {formatLabel(symptom)}
            </button>
          )
        })}
      </div>

      <div className="selected-rail">
        <span className="count">{selected.length}</span> symptom{selected.length === 1 ? '' : 's'} selected
      </div>
    </div>
  )
}
