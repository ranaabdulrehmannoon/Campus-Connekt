import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await axios.post('/api/auth/forgot-password', { email })
      setMessage(response.data.message || 'Password reset instructions sent.')
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken)
      }
    } catch (error) {
      const nextMessage = error.response?.data?.message || 'Failed to request password reset'
      setMessage(nextMessage)
      toast.error(nextMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Account recovery</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600">Request a reset code using your approved university email suffix.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          className="input-field"
          placeholder="name@edu.pk"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Send reset code'}
        </button>
      </form>

      {message && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div>}

      {resetToken && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Development reset code: <span className="font-semibold">{resetToken}</span>
        </div>
      )}

      <p className="mt-4 text-sm text-slate-600">
        Already have a code? <Link to="/reset-password" className="font-semibold text-blue-600 hover:text-blue-700">Reset password</Link>
      </p>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
          Back to login
        </Link>
      </div>
    </section>
  )
}

export default ForgotPassword
