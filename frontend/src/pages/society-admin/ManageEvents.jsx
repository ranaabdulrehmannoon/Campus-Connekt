import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const initialEditState = {
  event_id: null,
  title: '',
  description: '',
  start_datetime: '',
  end_datetime: '',
  location: '',
  capacity: '',
  category: 'workshop',
}

const statusClassMap = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

const ManageEvents = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [participantsOpenFor, setParticipantsOpenFor] = useState(null)
  const [participants, setParticipants] = useState({ all: [], registered: [], waitlisted: [] })
  const [participantView, setParticipantView] = useState('registered')
  const [editData, setEditData] = useState(initialEditState)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [saving, setSaving] = useState(false)

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

  const loadMyEvents = async () => {
    try {
      const response = await axios.get('/api/events/my-events')
      setEvents(response.data.events || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load your events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyEvents()
  }, [])

  const openEdit = (event) => {
    setEditData({
      event_id: event.event_id,
      title: event.title || '',
      description: event.description || '',
      start_datetime: event.start_datetime ? String(event.start_datetime).slice(0, 16) : '',
      end_datetime: event.end_datetime ? String(event.end_datetime).slice(0, 16) : '',
      location: event.location || '',
      capacity: event.capacity || '',
      category: event.category || 'workshop',
    })
    setThumbnailFile(null)
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!editData.event_id) return

    setSaving(true)
    try {
      const payload = new FormData()
      payload.append('title', editData.title)
      payload.append('description', editData.description)
      payload.append('start_datetime', editData.start_datetime)
      payload.append('end_datetime', editData.end_datetime)
      payload.append('location', editData.location)
      payload.append('capacity', editData.capacity)
      payload.append('category', editData.category)
      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile)
      }

      await axios.put(`/api/events/${editData.event_id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Event updated successfully')
      setEditData(initialEditState)
      await loadMyEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm('Delete this event permanently?')
    if (!confirmed) return

    try {
      await axios.delete(`/api/events/${eventId}`)
      toast.success('Event deleted successfully')
      await loadMyEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete event')
    }
  }

  const handleCloseRegistration = async (eventId) => {
    try {
      await axios.patch(`/api/events/${eventId}/close-registration`)
      toast.success('Registration closed for this event')
      await loadMyEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close registration')
    }
  }

  const handleViewParticipants = async (eventId) => {
    try {
      const response = await axios.get(`/api/events/${eventId}/participants`)
      setParticipants(response.data.participants || { all: [], registered: [], waitlisted: [] })
      setParticipantsOpenFor(eventId)
      setParticipantView('registered')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load participants')
    }
  }

  const handleOpenRegistration = async (eventId) => {
    try {
      await axios.patch(`/api/events/${eventId}/open-registration`)
      toast.success('Registration opened for this event')
      await loadMyEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open registration')
    }
  }

  const handleCancelParticipant = async (eventId, registrationId) => {
    const confirmed = window.confirm('Cancel this participant registration?')
    if (!confirmed) return

    try {
      const response = await axios.patch(`/api/events/${eventId}/participants/${registrationId}/cancel`)
      toast.success(response.data.message || 'Participant cancelled')
      await handleViewParticipants(eventId)
      await loadMyEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel participant')
    }
  }

  const activeParticipants = participants[participantView] || []

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-6 py-8 text-white shadow-xl shadow-slate-200/40 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">Event Management</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Create, edit, open, close, and manage registrations in one place.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">Organize your society events with clear controls for publishing, capacity, participants, and waitlists.</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading your events...</div>
      ) : (
        <div className="space-y-5">
          {events.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-600">No events created yet.</div>
          ) : (
            events.map((event) => {
              const isOpen = event.status === 'open'
              return (
              <div key={event.event_id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:p-6">
                  <div className="flex min-w-0 items-start gap-4">
                    <img
                      src={event.thumbnail_url || '/vite.svg'}
                      alt={event.title}
                      className="h-24 w-32 rounded-2xl border border-slate-200 object-cover sm:h-28 sm:w-40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{event.title}</h2>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusClassMap[event.status] || statusClassMap.draft}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700">Location:</span> {event.location || 'No location'}</p>
                        <p><span className="font-semibold text-slate-700">Category:</span> {event.category}</p>
                        <p><span className="font-semibold text-slate-700">Registration:</span> {event.start_datetime || 'TBD'}</p>
                        <p><span className="font-semibold text-slate-700">Capacity:</span> {event.capacity || 'Unlimited'} · <span className="font-semibold text-slate-700">Registrations:</span> {event.registrations_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button type="button" onClick={() => openEdit(event)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Edit event</button>
                    <button type="button" onClick={() => handleDelete(event.event_id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">Delete event</button>
                    <button type="button" onClick={() => handleViewParticipants(event.event_id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Participants</button>
                    {!event.is_approved && event.status === 'draft' ? (
                      <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                        Pending approval
                      </span>
                    ) : isOpen ? (
                      <button type="button" onClick={() => handleCloseRegistration(event.event_id)} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">Close registration</button>
                    ) : (
                      <button type="button" onClick={() => handleOpenRegistration(event.event_id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Open registration</button>
                    )}
                  </div>
                </div>

                {participantsOpenFor === event.event_id && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Participants management</h3>
                        <p className="text-xs text-slate-500">View registered users, waitlisted users, and cancel a participant if needed.</p>
                      </div>
                      <button type="button" onClick={() => setParticipantsOpenFor(null)} className="self-start text-xs font-semibold text-slate-500 hover:text-slate-700">Close</button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setParticipantView('registered')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${participantView === 'registered' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-white'}`}>
                        Registered ({participants.registered.length})
                      </button>
                      <button type="button" onClick={() => setParticipantView('waitlisted')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${participantView === 'waitlisted' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-white'}`}>
                        Waitlisted ({participants.waitlisted.length})
                      </button>
                      <button type="button" onClick={() => setParticipantView('all')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${participantView === 'all' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-white'}`}>
                        All ({participants.all.length})
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {activeParticipants.length > 0 ? activeParticipants.map((participant) => (
                        <div key={participant.registration_id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{participant.first_name} {participant.last_name}</p>
                              <p className="mt-0.5 text-slate-600">{participant.email}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">{participant.status}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{participant.department || 'No department'} · {participant.batch_year || 'No batch year'}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleCancelParticipant(event.event_id, participant.registration_id)}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Cancel participant
                            </button>
                          </div>
                        </div>
                      )) : <p className="text-sm text-slate-500">No participants in this view yet.</p>}
                    </div>
                  </div>
                )}
              </div>
              )
            })
          )}
        </div>
      )}

      {editData.event_id && (
        <form onSubmit={handleUpdate} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-xl font-semibold text-slate-900">Edit Event</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={editData.title} onChange={(e) => setEditData((current) => ({ ...current, title: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 sm:col-span-2" placeholder="Title" required />
            <textarea value={editData.description} onChange={(e) => setEditData((current) => ({ ...current, description: e.target.value }))} rows="4" className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 sm:col-span-2" placeholder="Description" required />
            <input type="datetime-local" value={editData.start_datetime} onChange={(e) => setEditData((current) => ({ ...current, start_datetime: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
            <input type="datetime-local" value={editData.end_datetime} onChange={(e) => setEditData((current) => ({ ...current, end_datetime: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
            <input value={editData.location} onChange={(e) => setEditData((current) => ({ ...current, location: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Location" required />
            <input type="number" min="1" value={editData.capacity} onChange={(e) => setEditData((current) => ({ ...current, capacity: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Capacity" />
            <select value={editData.category} onChange={(e) => setEditData((current) => ({ ...current, category: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
              <option value="competition">Competition</option>
              <option value="social">Social</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="meetup">Meetup</option>
              <option value="other">Other</option>
            </select>
            <div>
              <input type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" />
              {(thumbnailPreview || events.find((item) => item.event_id === editData.event_id)?.thumbnail_url) && (
                <img
                  src={thumbnailPreview || events.find((item) => item.event_id === editData.event_id)?.thumbnail_url}
                  alt="Event thumbnail preview"
                  className="mt-3 h-28 w-40 rounded-xl border border-slate-200 object-cover"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditData(initialEditState)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default ManageEvents
