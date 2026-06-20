import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PulseDivider from './PulseDivider'

export default function ChartHeader() {
  const { user, logout } = useAuth()

  return (
    <>
      <div className="chart-header">
        <div className="chart-title">
          <span className="brand-mark" />
          <h1>MediPredict</h1>
        </div>
        <div className="chart-user">
          Signed in as <strong>{user?.username}</strong>
          <br />
          <span className="logout-link" onClick={logout}>Log out</span>
        </div>
      </div>

      <nav className="chart-tabs">
        <NavLink to="/" end className={({ isActive }) => `chart-tab${isActive ? ' active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/checker" className={({ isActive }) => `chart-tab${isActive ? ' active' : ''}`}>
          Symptom Checker
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `chart-tab${isActive ? ' active' : ''}`}>
          Recent History
        </NavLink>
        <NavLink to="/model-stats" className={({ isActive }) => `chart-tab${isActive ? ' active' : ''}`}>
          Model Stats
        </NavLink>
        <NavLink to="/nearby" className={({ isActive }) => `chart-tab${isActive ? ' active' : ''}`}>
          Nearby Care
        </NavLink>
      </nav>

      <PulseDivider />
    </>
  )
}
