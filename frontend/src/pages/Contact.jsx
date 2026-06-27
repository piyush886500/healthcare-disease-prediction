import { useState } from 'react'
import client from '../api/client'
import ChartHeader from '../components/ChartHeader'

const CONTACT_EMAIL = 'piyush886582@gmail.com'

export default function Contact() {
  return (
    <div className="chart-shell">
      <ChartHeader />

      <div className="panel">
        <div className="panel-title">Contact Us</div>

        <p className="result-description" style={{ marginBottom: 20 }}>
          Have a question, found a bug, or want to suggest a feature? Send a message
          below and it'll be emailed to {CONTACT_EMAIL} directly from the app.
        </p>

        <ContactForm />
      </div>
    </div>
  )
}

function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      await client.post('/api/contact', { name, email: email || null, message })
      setStatus('sent')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.detail || 'Could not send the message, please try again.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="form-error" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: 'var(--accent-line)' }}>
        Message sent — thanks for reaching out!{' '}
        <span className="header-link" style={{ cursor: 'pointer' }} onClick={() => setStatus('idle')}>
          Send another
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === 'error' && <div className="form-error">{errorMsg}</div>}

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="email">Your email (optional, so we can reply)</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
      <button className="btn btn-primary" type="submit" disabled={status === 'sending'} style={{ width: 'auto' }}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}