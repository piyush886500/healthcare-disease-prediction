import ChartHeader from '../components/ChartHeader'

export default function About() {
  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div className="panel-title">About MediPredict</div>

        <p className="result-description" style={{ marginBottom: 16 }}>
          MediPredict is a symptom-checking tool that uses a machine learning model
          trained on a labeled symptom-to-disease dataset to suggest possible conditions
          based on the symptoms you select. It also surfaces a confidence score, the most
          likely alternative conditions, a suggested type of doctor to consult, and basic
          precautions for the predicted condition.
        </p>

        <div className="result-section-label">How it works</div>
        <p className="result-description" style={{ marginBottom: 16 }}>
          Select your symptoms in the Symptom Checker, and a Random Forest model predicts
          the most likely condition along with two runner-up possibilities. The Nearby
          Care page can also look up hospitals and clinics close to any pincode.
        </p>

        <div className="result-section-label">Important disclaimer</div>
        <p className="result-description">
          MediPredict is intended for general informational purposes only and is not a
          substitute for professional medical advice, diagnosis, or treatment. Always seek
          the advice of a qualified healthcare provider with any questions you may have
          regarding a medical condition. If a result flags a possible emergency, seek
          immediate medical attention.
        </p>
      </div>
    </div>
  )
}