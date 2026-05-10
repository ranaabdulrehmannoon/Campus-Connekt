import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') || ''

  const [formData, setFormData] = useState({
    token: initialToken,
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (initialToken) {
      setFormData((current) => ({ ...current, token: initialToken }))
    }
  }, [initialToken])

  const passwordsMatch = useMemo(
    () => formData.password.length > 0 && formData.password === formData.confirmPassword,
    [formData.password, formData.confirmPassword]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    if (message) {
      setMessage('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token: formData.token.trim(),
        password: formData.password,
      })

      toast.success(response.data.message || 'Password updated')
      setMessage(response.data.message || 'Password updated successfully.')
      setTimeout(() => navigate('/login'), 900)
    } catch (error) {
      const nextMessage = error.response?.data?.message || 'Failed to reset password'
      setMessage(nextMessage)
      toast.error(nextMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Password reset</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the reset code sent to your email, or open the email link and continue from there.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="token">
            Reset code
          </label>
          <input
            id="token"
            name="token"
            type="text"
            className="input-field"
            placeholder="Paste reset code here"
            value={formData.token}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input-field"
            placeholder="Create a new password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="input-field"
            placeholder="Confirm the new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? 'Updating password...' : 'Reset password'}
        </button>
      </form>

      {message && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div>}

      <p className="mt-4 text-sm text-slate-600">
        Remembered your password? <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Back to login</Link>
      </p>
    </section>
  )
}

export default ResetPassword
