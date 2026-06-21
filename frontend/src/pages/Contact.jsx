import { useState } from 'react'
import ChartHeader from '../components/ChartHeader'

const CONTACT_EMAIL = 'piyush886582@gmail.com'

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
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <div className="result-section-label">Send a message</div>
        <p className="result-description" style={{ marginBottom: 12 }}>
          Write your message below. "Open in email app" tries to open your default email
          app — if nothing happens (common if you don't have one set up), use "Copy
          message" instead and paste it into Gmail, WhatsApp, or wherever you'd like to
          send it to {CONTACT_EMAIL}.
        </p>

        <ContactForm />
      </div>
    </div>
  )
}

function ContactForm() {
  const [copied, setCopied] = useState(false)

  const buildMessage = (form) => {
    const name = form.name.value
    const message = form.message.value
    return {
      name,
      message,
      fullText: `From: ${name || 'a user'}\n\n${message}`,
    }
  }

  const handleOpenEmailApp = (e) => {
    e.preventDefault()
    const { name, message } = buildMessage(e.target)
    const subject = encodeURIComponent(`MediPredict feedback from ${name || 'a user'}`)
    const body = encodeURIComponent(message)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  const handleCopy = async (e) => {
    e.preventDefault()
    const form = e.target.closest('form')
    const { fullText } = buildMessage(form)
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert('Could not copy automatically — please select and copy the text manually.')
    }
  }

  return (
    <form onSubmit={handleOpenEmailApp}>
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
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>
          Open in email app
        </button>
        <button className="btn btn-ghost" type="button" onClick={handleCopy} style={{ width: 'auto' }}>
          {copied ? 'Copied ✓' : 'Copy message'}
        </button>
      </div>
    </form>
  )
}