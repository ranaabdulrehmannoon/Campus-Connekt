import React from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

const Home = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleFeatureClick = (path) => {
    if (!user) {
      toast.error('Login to join events or societies')
      navigate('/login')
      return
    }

    navigate(path)
  }

  return (
    <section className="min-h-[72vh] flex items-center justify-center pt-24 md:pt-32 pb-12">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Welcome to Campus ConneKt</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Discover events, societies, and resources designed for NUST students.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" onClick={() => handleFeatureClick('/events')} className="btn-primary">
            Browse Events
          </button>
          <button type="button" onClick={() => handleFeatureClick('/societies')} className="btn-outline">
            Explore Societies
          </button>
        </div>
      </div>
    </section>
  )
}

export default Home
