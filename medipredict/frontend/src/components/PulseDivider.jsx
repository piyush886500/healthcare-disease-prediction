// The signature element: a quiet EKG-style rule used once, beneath the
// chart header, in place of a generic horizontal line.
export default function PulseDivider() {
  return (
    <div className="pulse-divider" aria-hidden="true">
      <svg viewBox="0 0 800 28" preserveAspectRatio="none">
        <path d="M0,14 L260,14 L280,4 L300,24 L320,14 L800,14" />
        <circle className="pulse-dot" cx="300" cy="24" r="2.5" />
      </svg>
    </div>
  )
}
