import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'

const VerifyEmail = () => {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    let mounted = true

    const verify = async () => {
      if (!token) {
        if (!mounted) return
        setStatus('error')
        setMessage('Verification token is missing.')
        return
      }

      try {
        const response = await axios.get(`/api/auth/verify/${token}`)
        if (!mounted) return

        setStatus('success')
        setMessage(response.data?.message || 'Email verified successfully. You can now log in.')
      } catch (error) {
        if (!mounted) return

        setStatus('error')
        setMessage(error.response?.data?.message || 'Unable to verify email. The verification link may be invalid or expired.')
      }
    }

    verify()

    return () => {
      mounted = false
    }
  }, [token])

  return (
    <section className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Email Verification</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>

      {status === 'loading' && (
        <p className="mt-3 text-sm text-slate-500">Please wait...</p>
      )}

      {status !== 'loading' && (
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      )}
    </section>
  )
}

export default VerifyEmail
