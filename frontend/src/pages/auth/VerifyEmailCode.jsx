import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const VerifyEmailCode = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmailCode, resendVerificationCode } = useAuth()

  const initialEmail = useMemo(() => {
    const fromState = String(location.state?.email || '').trim().toLowerCase()
    if (fromState) return fromState
    return String(sessionStorage.getItem('pendingVerificationEmail') || '').trim().toLowerCase()
  }, [location.state?.email])

  const requiresApproval = Boolean(location.state?.requiresApproval)

  const email = initialEmail
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email) {
      setLoading(false)
      setError('Verification email is missing. Please return to login and open verification again.')
      return
    }

    const result = await verifyEmailCode(email, code.trim())
    setLoading(false)

    if (!result.success) {
      setError(result.message || 'Verification failed')
      return
    }

    setSuccess(result.message || 'Email verified successfully. You can now log in.')
    sessionStorage.removeItem('pendingVerificationEmail')
    setTimeout(() => navigate('/login'), 700)
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    setSuccess('')

    if (!email) {
      setResending(false)
      setError('Verification email is missing. Please return to login and open verification again.')
      return
    }

    const result = await resendVerificationCode(email)
    setResending(false)

    if (!result.success) {
      setError(result.message || 'Could not resend code')
      return
    }

    setSuccess(result.message || 'A new verification code was sent')
  }

  return (
    <section className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Verify Email</h1>
      <p className="mt-2 text-sm text-slate-600">Enter the code sent to your email to activate your account.</p>
      {requiresApproval && (
        <p className="mt-2 text-sm text-amber-700">After email verification, your organizer account will remain pending admin approval.</p>
      )}

      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {success && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <form onSubmit={handleVerify} className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 break-all">
            {email || 'Unavailable'}
          </p>
        </div>

        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">Verification code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <button type="button" onClick={handleResend} className="text-blue-600 hover:text-blue-700" disabled={resending}>
          {resending ? 'Sending...' : 'Resend code'}
        </button>
        <Link to="/login" className="text-slate-600 hover:text-slate-800">Back to login</Link>
      </div>
    </section>
  )
}

export default VerifyEmailCode
