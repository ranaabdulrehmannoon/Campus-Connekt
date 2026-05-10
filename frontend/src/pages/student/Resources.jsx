import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const typeOptions = ['all', 'notes', 'book', 'slides', 'past_paper', 'link', 'other']

const Resources = () => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', subject: '', type: 'all' })

  const subjects = useMemo(() => {
    const uniqueSubjects = new Set()
    resources.forEach((resource) => {
      if (resource.subject) {
        uniqueSubjects.add(resource.subject)
      }
    })
    return Array.from(uniqueSubjects)
  }, [resources])

  useEffect(() => {
    const loadResources = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (filters.search.trim()) query.append('search', filters.search.trim())
        if (filters.subject) query.append('subject', filters.subject)
        if (filters.type !== 'all') query.append('type', filters.type)

        const response = await axios.get(`/api/resources?${query.toString()}`)
        setResources(response.data.resources || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load resources')
      } finally {
        setLoading(false)
      }
    }

    loadResources()
  }, [filters.search, filters.subject, filters.type])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Resources</h1>
          <p className="mt-1 text-slate-600">Browse approved notes, books, slides, and links.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/resource-requests" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Request resource
          </Link>
          <Link to="/upload-resource" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Upload resource
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title, description, or uploader"
            className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
          />
          <select
            value={filters.subject}
            onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value }))}
            className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type === 'all' ? 'All types' : type}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading resources...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm lg:col-span-2">No approved resources found.</div>
          ) : (
            resources.map((resource) => (
              <article key={resource.resource_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{resource.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{resource.description || 'No description provided.'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {resource.resource_type}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-800">Subject:</span> {resource.subject || 'Not set'}</p>
                  <p><span className="font-semibold text-slate-800">Uploaded by:</span> {resource.uploaded_by_name || 'Unknown'}</p>
                  <p><span className="font-semibold text-slate-800">Rating:</span> {Number(resource.avg_rating || 0).toFixed(1)} / 5</p>
                  <p><span className="font-semibold text-slate-800">Downloads:</span> {resource.download_count || 0}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/resource/${resource.resource_id}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    View details
                  </Link>
                  <a href={resource.download_url} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Download
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default Resources
