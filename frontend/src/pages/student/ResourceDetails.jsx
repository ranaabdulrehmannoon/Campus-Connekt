import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const ResourceDetails = () => {
  const { id } = useParams()
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadResource = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`/api/resources/${id}`)
        setResource(response.data.resource)
        setRating(response.data.resource?.user_rating || 0)
        setReview(response.data.resource?.user_review || '')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load resource')
      } finally {
        setLoading(false)
      }
    }

    loadResource()
  }, [id])

  const canRate = useMemo(() => Boolean(resource), [resource])

  const handleRate = async () => {
    if (!resource || rating < 1 || rating > 5) {
      toast.error('Select a rating from 1 to 5')
      return
    }

    setSubmitting(true)
    try {
      const response = await axios.post(`/api/resources/${resource.resource_id}/rate`, {
        stars: rating,
        review,
      })
      toast.success(response.data.message || 'Rating saved')

      const refreshed = await axios.get(`/api/resources/${id}`)
      setResource(refreshed.data.resource)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading resource...</div>
  }

  if (!resource) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-600">Resource not found.</div>
  }

  return (
    <section className="max-w-4xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{resource.title}</h1>
            <p className="mt-2 text-slate-600">{resource.description || 'No description provided.'}</p>
          </div>
          <a href={resource.download_url} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Download
          </a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-800">Subject:</span> {resource.subject || 'Not set'}</p>
          <p><span className="font-semibold text-slate-800">Uploader:</span> {resource.uploader_name || 'Unknown'}</p>
          <p><span className="font-semibold text-slate-800">Type:</span> {resource.resource_type}</p>
          <p><span className="font-semibold text-slate-800">Downloads:</span> {resource.download_count || 0}</p>
          <p><span className="font-semibold text-slate-800">Average rating:</span> {Number(resource.avg_rating || 0).toFixed(1)} / 5</p>
          <p><span className="font-semibold text-slate-800">Ratings:</span> {resource.rating_count || 0}</p>
        </div>

        {resource.external_url && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            External link: <a href={resource.external_url} className="font-semibold text-blue-700 hover:underline" target="_blank" rel="noreferrer">Open resource</a>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Rate this resource</h2>
        <p className="mt-1 text-sm text-slate-600">Share how useful this resource was.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-bold ${rating >= star ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-slate-600'}`}
            >
              {star}
            </button>
          ))}
        </div>

        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          rows="4"
          placeholder="Write a short review"
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={handleRate}
          disabled={!canRate || submitting}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Submitting...' : resource.user_rating ? 'Update review' : 'Submit review'}
        </button>
      </div>
    </section>
  )
}

export default ResourceDetails