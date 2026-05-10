import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'

const CreateEvent = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const societyIdFromQuery = searchParams.get('societyId')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    capacity: '',
    category: 'workshop',
    registration_deadline: '',
    visibility: 'public',
    society_id: societyIdFromQuery || '',
  })
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('')
      return
    }

    const previewUrl = URL.createObjectURL(thumbnailFile)
    setThumbnailPreview(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [thumbnailFile])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.title || !formData.description || !formData.start_datetime || !formData.end_datetime || !formData.location || !formData.category) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmitting(true)

    try {
      const payload = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          payload.append(key, value)
        }
      })

      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile)
      }

      await axios.post('/api/events', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Event created successfully')
      if (societyIdFromQuery) {
        navigate(`/society/${societyIdFromQuery}/dashboard`)
      } else {
        navigate('/manage-events')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">Create Event</h1>
          <p className="text-slate-600">Create a new event and submit it for approval.</p>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
          <input name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Event title" required />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Describe your event" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date & Time</label>
            <input type="datetime-local" name="start_datetime" value={formData.start_datetime} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">End Date & Time</label>
            <input type="datetime-local" name="end_datetime" value={formData.end_datetime} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
            <input name="location" value={formData.location} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Campus Hall A" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Capacity</label>
            <input type="number" min="1" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="100" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
            <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
              <option value="competition">Competition</option>
              <option value="social">Social</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="meetup">Meetup</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Registration Deadline</label>
            <input type="datetime-local" name="registration_deadline" value={formData.registration_deadline} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Visibility</label>
            <select name="visibility" value={formData.visibility} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
              <option value="public">Public</option>
              <option value="society_only">Society only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Thumbnail Upload</label>
            <input type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" />
            {thumbnailPreview && (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="mt-3 h-36 w-full rounded-xl border border-slate-200 object-cover"
              />
            )}
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
        </section>
      </div>
    </div>
  )
}

export default CreateEvent
