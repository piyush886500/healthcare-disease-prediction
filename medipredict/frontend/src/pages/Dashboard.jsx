import { Link } from 'react-router-dom'
import ChartHeader from '../components/ChartHeader'

const FEATURES = [
  {
    to: '/checker',
    title: 'Symptom Checker',
    description: 'Select your symptoms and get a predicted condition, confidence score, and doctor referral.',
  },
  {
    to: '/history',
    title: 'Recent History',
    description: 'Review the last few symptom checks that have been run.',
  },
  {
    to: '/model-stats',
    title: 'Model Stats',
    description: 'See how the prediction model performs and which symptoms matter most.',
  },
  {
    to: '/nearby',
    title: 'Nearby Care',
    description: 'Find hospitals and clinics close to any pincode.',
  },
]

export default function Dashboard() {
  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel-title" style={{ marginBottom: 4 }}>Welcome</div>
      <h2 style={{ marginBottom: 24, fontWeight: 500 }}>What would you like to do?</h2>

      <div className="feature-grid">
        {FEATURES.map((f) => (
          <Link to={f.to} key={f.to} className="feature-card">
            <div className="feature-card-title">{f.title}</div>
            <div className="feature-card-desc">{f.description}</div>
            <span className="feature-card-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}