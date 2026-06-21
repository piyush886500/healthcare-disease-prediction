import ChartHeader from '../components/ChartHeader'

export default function Contact() {
  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div className="panel-title">Contact Us</div>

        <p className="result-description" style={{ marginBottom: 20 }}>
          Have a question, found a bug, or want to suggest a feature? Reach out using
          either option below.
        </p>

        <div className="result-section-label">Email</div>
        <p className="result-description" style={{ marginBottom: 16 }}>
          <a href="mailto:piyush822494@gmail.com">support@medipredict.app</a>
        </p>

        <div className="result-section-label">Send a message</div>
        <p className="result-description" style={{ marginBottom: 12 }}>
          This opens your default email app with the message pre-filled — nothing is sent
          through this site directly.
        </p>

        <ContactForm />
      </div>
    </div>
  )
}

function ContactForm() {
  const handleSubmit = (e) => {
    e.preventDefault()
    const name = e.target.name.value
    const message = e.target.message.value
    const subject = encodeURIComponent(`MediPredict feedback from ${name || 'a user'}`)
    const body = encodeURIComponent(message)
    window.location.href = `mailto:support@medipredict.app?subject=${subject}&body=${body}`
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          style={{
            width: '100%',
            padding: '11px 13px',
            border: '1px solid var(--line-strong)',
            borderRadius: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            resize: 'vertical',
          }}
        />
      </div>
      <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>
        Open in email app
      </button>
    </form>
  )
}