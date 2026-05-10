import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { AuthContext } from './authContext'

// Use Vite environment variable VITE_API_URL when provided, otherwise fallback to localhost:5000
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(sessionStorage.getItem('token'))

  axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : ''

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Fetch user error:', error)
      sessionStorage.removeItem('token')
      setToken(null)
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      const { token: nextToken, user: nextUser } = response.data

      sessionStorage.setItem('token', nextToken)
      setToken(nextToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${nextToken}`
      setUser(nextUser)

      toast.success('Login successful!')
      return { success: true, role: nextUser.role, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData)
      const { token: nextToken, user: nextUser } = response.data

      if (nextToken) {
        sessionStorage.setItem('token', nextToken)
        setToken(nextToken)
        axios.defaults.headers.common['Authorization'] = `Bearer ${nextToken}`
        setUser(nextUser)
      }

      toast.success(response.data.message || 'Registration successful')
      return {
        success: true,
        role: nextUser?.role,
        requiresApproval: Boolean(response.data.requiresApproval),
        requiresVerification: Boolean(response.data.requiresVerification),
        email: nextUser?.email,
        message: response.data.message,
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  const verifyEmailCode = async (email, code) => {
    try {
      const response = await axios.post('/api/auth/verify-code', { email, code })
      toast.success(response.data.message || 'Email verified successfully')
      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  const resendVerificationCode = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-verification-code', { email })
      toast.success(response.data.message || 'Verification code sent')
      return {
        success: true,
        message: response.data.message,
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend verification code'
      toast.error(message)
      return { success: false, message }
    }
  }

  const logout = () => {
    sessionStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmailCode, resendVerificationCode, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}