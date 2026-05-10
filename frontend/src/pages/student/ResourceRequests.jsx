import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  open: { label: 'Open', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  fulfilled: { label: 'Fulfilled', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  closed: { label: 'Closed', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
}

const ResourceRequests = () => {
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myRequests, setMyRequests] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('my-requests') // 'my-requests' or 'all-requests'
  const [formData, setFormData] = useState({ title: '', description: '', subject: '' })
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [responses, setResponses] = useState({})
  const [responseText, setResponseText] = useState('')
  const [loadingResponses, setLoadingResponses] = useState({})
  const [submittingResponse, setSubmittingResponse] = useState({})

  const loadMyRequests = async () => {
    try {
      const response = await axios.get('/api/resources/requests/mine')
      setMyRequests(response.data.requests || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load your requests')
    }
  }

  const loadAllRequests = async () => {
    try {
      const response = await axios.get('/api/resources/requests/all', {
        params: { status: 'open', search }
      })
      setAllRequests(response.data.requests || [])
    } catch (error) {
      console.error('Failed to load requests:', error)
    }
  }

  const loadResponses = async (requestId) => {
    if (responses[requestId]) return // Already loaded

    setLoadingResponses((prev) => ({ ...prev, [requestId]: true }))
    try {
      const response = await axios.get(`/api/resources/requests/${requestId}/responses`)
      setResponses((prev) => ({
        ...prev,
        [requestId]: response.data.responses || [],
      }))
    } catch (error) {
      toast.error('Failed to load responses')
    } finally {
      setLoadingResponses((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const handleLoadRequests = async () => {
    setLoading(true)
    try {
      await loadMyRequests()
      await loadAllRequests()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleLoadRequests()
  }, [])

  useEffect(() => {
    if (tab === 'all-requests') {
      loadAllRequests()
    }
  }, [search, tab])

  const filteredMyRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return myRequests

    return myRequests.filter((request) =>
      [request.title, request.description, request.subject, request.status, request.fulfilled_by_name, request.resource_title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [myRequests, search])

  const filteredAllRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return allRequests

    return allRequests.filter((request) =>
      [request.title, request.description, request.subject, request.requester_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [allRequests, search])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.title.trim() || !formData.description.trim() || !formData.subject.trim()) {
      toast.error('Title, description, and subject are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await axios.post('/api/resources/requests', {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
      })

      toast.success(response.data.message || 'Request created')
      setFormData({ title: '', description: '', subject: '' })
      await loadMyRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitResponse = async (requestId) => {
    if (!responseText.trim()) {
      toast.error('Response text is required')
      return
    }

    setSubmittingResponse((prev) => ({ ...prev, [requestId]: true }))
    try {
      await axios.post(`/api/resources/requests/${requestId}/responses`, {
        response_text: responseText.trim(),
      })

      toast.success('Response added successfully')
      setResponseText('')
      setSelectedRequest(null)
      
      // Reload responses
      setResponses((prev) => ({ ...prev, [requestId]: undefined }))
      await loadResponses(requestId)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add response')
    } finally {
      setSubmittingResponse((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const handleViewResponses = (request) => {
    setSelectedRequest(request)
    loadResponses(request.request_id)
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Resource requests</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Request learning material</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Create a request for notes, books, slides, or any approved resource you need for class.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            {[
              { label: 'Open', value: myRequests.filter((item) => item.status === 'open').length },
              { label: 'Fulfilled', value: myRequests.filter((item) => item.status === 'fulfilled').length },
              { label: 'Closed', value: myRequests.filter((item) => item.status === 'closed').length },
              { label: 'Total', value: myRequests.length },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Create a request</p>
              <p className="text-sm text-slate-600">Keep it specific so other students can fulfill it quickly.</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Need Database Systems lecture notes"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              placeholder="Add context, chapters, deadline, or format details."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
            <input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Computer Science"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit request'}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </form>

        <aside className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Search requests</p>
            <div className="relative mt-3">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter by title, subject, or name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <button
              onClick={() => setTab('my-requests')}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'my-requests'
                  ? 'bg-slate-950 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setTab('all-requests')}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'all-requests'
                  ? 'bg-slate-950 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Requests
            </button>
          </div>
        </aside>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              {tab === 'my-requests' ? 'My requests' : 'All requests'}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {tab === 'my-requests' ? 'Request history' : 'Open requests'}
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            {tab === 'my-requests'
              ? 'See whether each request is still open, fulfilled, or closed.'
              : 'Help other students by responding to their requests.'}
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading requests...</div>
        ) : tab === 'my-requests' ? (
          filteredMyRequests.length > 0 ? (
            <div className="mt-5 space-y-4 max-h-[600px] overflow-y-auto">
              {filteredMyRequests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.open
                return (
                  <article key={request.request_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{request.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{request.description || 'No description provided.'}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] whitespace-nowrap ${status.tone}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-800">Subject:</span> {request.subject || 'Not set'}</p>
                      <p><span className="font-semibold text-slate-800">Updated:</span> {new Date(request.updated_at).toLocaleString()}</p>
                      <p><span className="font-semibold text-slate-800">Created:</span> {new Date(request.created_at).toLocaleString()}</p>
                      <p><span className="font-semibold text-slate-800">Fulfilled by:</span> {request.fulfilled_by_name || 'Not yet fulfilled'}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === 'fulfilled' && request.resource_id ? (
                        <Link
                          to={`/resource/${request.resource_id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          View fulfilled resource
                          <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleViewResponses(request)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ChatBubbleLeftIcon className="h-4 w-4" />
                          View responses
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <UserCircleIcon className="h-10 w-10 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-950">No requests yet</p>
              <p className="mt-1 max-w-md text-sm text-slate-600">Create your first request above and it will appear here with its current status.</p>
            </div>
          )
        ) : filteredAllRequests.length > 0 ? (
          <div className="mt-5 space-y-4 max-h-[600px] overflow-y-auto">
            {filteredAllRequests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.open
              return (
                <article key={request.request_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{request.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">Requested by: <span className="font-semibold text-slate-700">{request.requester_name}</span></p>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{request.description || 'No description provided.'}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] whitespace-nowrap ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-800">Subject:</span> {request.subject || 'Not set'}</p>
                    <p><span className="font-semibold text-slate-800">Responses:</span> {request.response_count}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewResponses(request)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                      View & respond
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <DocumentTextIcon className="h-10 w-10 text-slate-400" />
            <p className="mt-4 text-lg font-semibold text-slate-950">No open requests</p>
            <p className="mt-1 max-w-md text-sm text-slate-600">There are no open requests right now. Check back soon!</p>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">{selectedRequest.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Requested by: <span className="font-semibold text-slate-800">{selectedRequest.requester_name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setResponseText('')
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-6 p-6">
              {/* Request Details */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Request Details</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p><span className="font-semibold">Subject:</span> {selectedRequest.subject}</p>
                  <p><span className="font-semibold">Status:</span> <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusConfig[selectedRequest.status]?.tone}`}>{statusConfig[selectedRequest.status]?.label}</span></p>
                  <p><span className="font-semibold">Created:</span> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold">Description:</span>
                  <br />
                  {selectedRequest.description}
                </p>
              </div>

              {/* Responses Section */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Responses ({responses[selectedRequest.request_id]?.length || 0})
                </h3>
                <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto">
                  {loadingResponses[selectedRequest.request_id] ? (
                    <p className="text-sm text-slate-500">Loading responses...</p>
                  ) : responses[selectedRequest.request_id]?.length > 0 ? (
                    responses[selectedRequest.request_id].map((response) => (
                      <div key={response.response_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          {response.profile_picture ? (
                            <img src={response.profile_picture} alt={response.user_name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">
                              {response.user_name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {response.user_name}
                              <span className="ml-2 text-xs font-normal text-slate-500">{response.role}</span>
                            </p>
                            <p className="mt-1 text-sm text-slate-700">{response.response_text}</p>
                            <p className="mt-2 text-xs text-slate-500">{new Date(response.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No responses yet. Be the first to help!</p>
                  )}
                </div>
              </div>

              {/* Add Response Form */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Your Response</h3>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Share the resource, location, or information that could help..."
                  rows="3"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(null)
                      setResponseText('')
                    }}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitResponse(selectedRequest.request_id)}
                    disabled={submittingResponse[selectedRequest.request_id] || !responseText.trim()}
                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submittingResponse[selectedRequest.request_id] ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ResourceRequests