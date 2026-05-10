import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const ALLOWED_EMAIL_SUFFIXES = [
  '@nust.edu.pk',
  '@edu.pk',
  '@seecs.edu.pk',
  '@smme.edu.pk',
  '@scme.edu.pk',
  '@sada.edu.pk',
  '@sns.edu.pk',
  '@nbs.edu.pk',
  '@igis.edu.pk',
  '@nice.edu.pk',
  '@nipcons.edu.pk',
  '@asab.edu.pk',
]

const Register = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    batchYear: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isUniversityEmail = useMemo(
    () => ALLOWED_EMAIL_SUFFIXES.some((suffix) => formData.email.trim().toLowerCase().endsWith(suffix)),
    [formData.email]
  )

  const onChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) {
      setError('')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!isUniversityEmail) {
      setError(`Please register with an approved email suffix: ${ALLOWED_EMAIL_SUFFIXES.join(', ')}`)
      return
    }

    setSubmitting(true)
    setError('')
    const result = await register({
      ...formData,
      email: formData.email.trim().toLowerCase(),
    })
    setSubmitting(false)

    if (result.success) {
      const verificationEmail = result.email || formData.email.trim().toLowerCase()
      sessionStorage.setItem('pendingVerificationEmail', verificationEmail)

      navigate('/verify-email', {
        state: {
          email: verificationEmail,
          requiresApproval: result.requiresApproval,
        },
      })
    } else {
      setError(result.message || 'Registration failed')
    }
  }

  return (
    <section className="max-w-2xl mx-auto card p-6">
      <h1 className="text-2xl font-bold mb-4">Create Account</h1>
      <p className="mb-4 text-sm text-gray-600">Use your university email. A verification code will be sent to email before login. Organizer accounts also require admin approval.</p>
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="firstName" className="input-field" placeholder="First name" value={formData.firstName} onChange={onChange} required />
        <input name="lastName" className="input-field" placeholder="Last name" value={formData.lastName} onChange={onChange} required />
        <input name="email" type="email" className="input-field md:col-span-2" placeholder="name@edu.pk" value={formData.email} onChange={onChange} required />
        <p className="md:col-span-2 -mt-2 text-xs text-gray-500">{isUniversityEmail ? 'University email detected.' : `Accepted suffixes: ${ALLOWED_EMAIL_SUFFIXES.join(', ')}`}</p>
        <select name="role" className="input-field md:col-span-2" value={formData.role} onChange={onChange}>
          <option value="student">Student</option>
          <option value="society_admin">Organizer / Society Admin</option>
        </select>
        <input name="password" type="password" className="input-field md:col-span-2" placeholder="Password" value={formData.password} onChange={onChange} required />
        <input name="department" className="input-field" placeholder="Department" value={formData.department} onChange={onChange} />
        <input name="batchYear" className="input-field" placeholder="Batch year" value={formData.batchYear} onChange={onChange} />
        <button className="btn-primary md:col-span-2" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Register'}</button>
      </form>
      <p className="text-sm text-gray-600 mt-4">Already registered? <Link to="/login" className="text-blue-600">Login</Link></p>
    </section>
  )
}

export default Register
