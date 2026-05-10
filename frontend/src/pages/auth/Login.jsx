import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/useAuth'

const ROLE_DESTINATIONS = {
  admin: '/dashboard',
  society_admin: '/dashboard',
  student: '/dashboard',
}

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showVerifyLink, setShowVerifyLink] = useState(false)

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberEmail')
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    setShowVerifyLink(false)

    try {
      const result = await login(formData.email, formData.password)

      if (!result.success) {
        const message = result.message || 'Login failed. Check your credentials and try again.'
        setError(message)
        setShowVerifyLink(message.toLowerCase().includes('verify your email'))
        return
      }

      if (rememberMe) {
        localStorage.setItem('rememberEmail', formData.email)
      } else {
        localStorage.removeItem('rememberEmail')
      }

      setSuccess('Login successful. Redirecting to your dashboard...')
      const destination = ROLE_DESTINATIONS[result.role] || '/dashboard'
      setTimeout(() => navigate(destination), 700)
    } catch (submitError) {
      setError(submitError?.message || 'An unexpected error occurred during sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-17 flex items-center justify-center gap-1 transform scale-270">
          <img src="/img/Logo.png" alt="Campus ConneKt" className="h-16 w-auto -rotate-6 object-contain scale-120" />
          <div className="flex flex-col justify-center -ml-2.5">
            <span className="text-2xl font-dancing font-medium text-[#7a5a21] leading-4">ampus</span>
            <span className="text-2xl font-dancing font-medium text-[#7a5a21] leading-8 -mt-1">onneKt</span>
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-200 backdrop-blur-sm px-8 py-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your CampusConneKt account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verify link hint */}
          {showVerifyLink && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Need a verification code?{' '}
              <Link
                to="/verify-email"
                state={{
                  email: (() => {
                    const normalizedEmail = formData.email.trim().toLowerCase()
                    if (normalizedEmail) {
                      sessionStorage.setItem('pendingVerificationEmail', normalizedEmail)
                    }
                    return normalizedEmail
                  })(),
                }}
                className="font-semibold text-blue-700 underline"
              >
                Verify your email here
              </Link>
              .
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                NUST Email
              </label>
              <div className="relative">
                <UserCircleIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@nust.edu.pk"
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-11 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember my email
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={`group inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 ${
                submitting
                  ? 'cursor-not-allowed bg-slate-400'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg'
              }`}
            >
              {submitting ? (
                'Signing in...'
              ) : (
                <>
                  Sign in
                  <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-600">
              New here?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
