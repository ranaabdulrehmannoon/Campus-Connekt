import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  FireIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const categories = ['all', 'technical', 'sports', 'seminar', 'workshop', 'cultural', 'social', 'meetup', 'competition', 'other']
const datePresets = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]
const sortOptions = [
  { value: 'soonest', label: 'Soonest' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_popular', label: 'Most popular' },
]
const registrationStatusClass = {
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  waitlisted: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
  attended: 'border-blue-200 bg-blue-50 text-blue-700',
}

const formatDateTime = (value) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatRelativeDate = (value) => {
  if (!value) return 'Date not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const diffHours = Math.round((date.getTime() - Date.now()) / 3600000)

  if (Math.abs(diffHours) < 1) return 'Now'
  if (diffHours < 0) return `${Math.abs(diffHours)}h ago`
  if (diffHours < 24) return `In ${diffHours}h`
  return `In ${Math.round(diffHours / 24)}d`
}

const formatShortDate = (value) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const getEventState = (event) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(event.start_datetime)
  const end = new Date(event.end_datetime || event.start_datetime)
  if (Number.isNaN(start.getTime())) return 'upcoming'

  if (start.toDateString() === today.toDateString()) return 'today'
  if (end < today) return 'past'
  return 'upcoming'
}

const getPopularScore = (event) => {
  const registrations = Number(event.registered_count || 0)
  const ratings = Number(event.total_ratings || 0)
  const average = Number(event.avg_rating || 0)
  return registrations * 4 + ratings * 3 + average
}

const getRegistrationLabel = (status) => {
  if (!status) return 'Open'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getButtonLabel = (event) => {
  if (event.user_registration_status === 'confirmed') return 'Registered'
  if (event.user_registration_status === 'waitlisted') return 'On waitlist'
  if (event.spots_left !== null && event.spots_left !== undefined && Number(event.spots_left) <= 0) return 'Join waitlist'
  return 'Register'
}

const Events = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('discover')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [pendingActionId, setPendingActionId] = useState(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [eventReviews, setEventReviews] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    society: 'all',
    date: 'all',
    sort: 'soonest',
  })

  const societyOptions = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      if (event.society_id && event.society_name) {
        map.set(event.society_id, event.society_name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [events])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filters.search.trim()) query.append('search', filters.search.trim())
      if (filters.category !== 'all') query.append('category', filters.category)
      if (filters.society !== 'all') query.append('society', filters.society)
      query.append('limit', '100')

      const response = await axios.get(`/api/events?${query.toString()}`)
      setEvents(response.data.events || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [filters.search, filters.category, filters.society])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    const matchesSearch = (event) => {
      if (!search) return true
      return [event.title, event.description, event.category, event.society_name, event.location, event.organizer_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    }

    const matchesDate = (event) => {
      if (filters.date === 'all') return true
      return getEventState(event) === filters.date
    }

    return [...events]
      .filter(matchesSearch)
      .filter(matchesDate)
      .sort((left, right) => {
        if (filters.sort === 'most_popular') {
          return getPopularScore(right) - getPopularScore(left)
        }

        if (filters.sort === 'newest') {
          return new Date(right.start_datetime || 0) - new Date(left.start_datetime || 0)
        }

        return new Date(left.start_datetime || 0) - new Date(right.start_datetime || 0)
      })
  }, [events, filters.date, filters.search, filters.sort])

  const registrations = useMemo(
    () => filteredEvents.filter((event) => event.user_registration_status && event.user_registration_status !== 'cancelled'),
    [filteredEvents]
  )

  const eventsToRender = activeTab === 'discover' ? filteredEvents : registrations

  const overview = useMemo(() => {
    const now = new Date()
    const upcoming = filteredEvents.filter((event) => new Date(event.start_datetime) >= now)
    const registered = filteredEvents.filter((event) => event.user_registration_status)
    const waitlisted = filteredEvents.filter((event) => event.user_registration_status === 'waitlisted')
    const soonest = [...filteredEvents].sort((left, right) => new Date(left.start_datetime || 0) - new Date(right.start_datetime || 0))[0]

    return {
      total: filteredEvents.length,
      upcoming: upcoming.length,
      registered: registered.length,
      waitlisted: waitlisted.length,
      soonest,
    }
  }, [filteredEvents])

  const canRateSelectedEvent = useMemo(() => {
    if (!selectedEvent) return false
    const registrationStatus = selectedEvent.user_registration_status
    if (registrationStatus === 'attended') return true
    const ended = new Date(selectedEvent.end_datetime) <= new Date()
    return registrationStatus === 'confirmed' && ended
  }, [selectedEvent])

  const openDetails = async (eventSummary) => {
    setSelectedEvent(eventSummary)
    setRating(eventSummary.user_rating || 0)
    setReview(eventSummary.user_review || '')
    setDetailsLoading(true)

    try {
      const [response, reviewsResponse] = await Promise.all([
        axios.get(`/api/events/${eventSummary.event_id}`),
        axios.get(`/api/events/${eventSummary.event_id}/reviews`).catch(() => ({ data: { reviews: [] } }))
      ])
      setSelectedEvent(response.data.event)
      setRating(response.data.event?.user_rating || 0)
      setReview(response.data.event?.user_review || '')
      setEventReviews(reviewsResponse.data.reviews || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load event details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const refreshSelectedEvent = useCallback(async (eventId) => {
    try {
      const [response, reviewsResponse] = await Promise.all([
        axios.get(`/api/events/${eventId}`),
        axios.get(`/api/events/${eventId}/reviews`).catch(() => ({ data: { reviews: [] } }))
      ])
      setSelectedEvent(response.data.event)
      setRating(response.data.event?.user_rating || 0)
      setReview(response.data.event?.user_review || '')
      setEventReviews(reviewsResponse.data.reviews || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to refresh event details')
    }
  }, [])

  const handleRegister = async (eventId) => {
    setPendingActionId(eventId)
    try {
      const response = await axios.post(`/api/events/${eventId}/register`)
      toast.success(response.data.message || 'Registration updated')
      await loadEvents()
      if (selectedEvent?.event_id === eventId) {
        await refreshSelectedEvent(eventId)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register')
    } finally {
      setPendingActionId(null)
    }
  }

  const handleCancelRegistration = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) {
      return
    }
    setPendingActionId(eventId)
    try {
      const response = await axios.delete(`/api/events/${eventId}/register`)
      toast.success(response.data.message || 'Registration cancelled')
      await loadEvents()
      if (selectedEvent?.event_id === eventId) {
        await refreshSelectedEvent(eventId)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel registration')
    } finally {
      setPendingActionId(null)
    }
  }

  const handleRateEvent = async () => {
    if (!selectedEvent) return
    if (rating < 1 || rating > 5) {
      toast.error('Please select a star rating from 1 to 5')
      return
    }

    setSubmittingRating(true)
    try {
      const response = await axios.post(`/api/events/${selectedEvent.event_id}/rate`, {
        stars: rating,
        review,
      })
      toast.success(response.data.message || 'Rating submitted')
      await loadEvents()
      await refreshSelectedEvent(selectedEvent.event_id)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review')
    } finally {
      setSubmittingRating(false)
    }
  }

  const closeModal = () => {
    setSelectedEvent(null)
    setRating(0)
    setReview('')
    setEventReviews([])
    setDetailsLoading(false)
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Events</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Approved events</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Search, filter, and manage registrations from one workspace.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'discover' ? 'bg-slate-950 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registrations')}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'registrations' ? 'bg-slate-950 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              My registrations
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            { label: 'Visible', value: overview.total },
            { label: 'Upcoming', value: overview.upcoming },
            { label: 'Registered', value: overview.registered },
            { label: 'Waitlisted', value: overview.waitlisted },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search title, keyword, or society"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-11 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </label>

          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All categories' : category}
              </option>
            ))}
          </select>

          <select
            value={filters.society}
            onChange={(event) => setFilters((current) => ({ ...current, society: event.target.value }))}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          >
            <option value="all">All societies</option>
            {societyOptions.map((society) => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>

          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, date: preset.value }))}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filters.date === preset.value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Loading events...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventsToRender.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm xl:col-span-2">
              {activeTab === 'discover' ? 'No events found for the current filters.' : 'No active registrations yet.'}
            </div>
          ) : (
            eventsToRender.map((event) => {
              const eventState = getEventState(event)
              const isFull = event.spots_left !== null && event.spots_left !== undefined && Number(event.spots_left) <= 0
              const isPendingAction = pendingActionId === event.event_id

              return (
                <article key={event.event_id} className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative">
                    <img
                      src={event.thumbnail_url || '/vite.svg'}
                      alt={event.title}
                      className="h-40 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-900">
                        {event.category || 'event'}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${eventState === 'past' ? 'border-slate-200 bg-white/90 text-slate-700' : 'border-white/20 bg-white/10 text-white'}`}>
                        {eventState}
                      </span>
                      {event.visibility === 'society_only' && (
                        <span className="rounded-full border border-purple-300 bg-purple-100/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-purple-900">
                          Society only
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                      <div className="max-w-[75%]">
                        <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>
                        <p className="mt-1 text-sm text-slate-200">{event.society_name || 'Independent event'} · {event.organizer_name || 'Organizer'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Starts</p>
                        <p className="mt-1 text-sm font-semibold">{formatShortDate(event.start_datetime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <p className="line-clamp-2 text-sm leading-5 text-slate-600">{event.description || 'No description provided.'}</p>

                    <div className="flex flex-col gap-2.5 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                        <span className="truncate">{formatDateTime(event.start_datetime)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                        <span className="truncate">{event.location || 'Location not set'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5" title="Available seats">
                          <UsersIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                          <span>{event.spots_left === null || event.spots_left === undefined ? 'Unlimited' : `${event.spots_left} left`}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5" title="Registration deadline">
                          <ClockIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                          <span>{event.registration_deadline ? formatShortDate(event.registration_deadline) : 'No deadline'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5" title="Rating">
                          <StarIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                          <span>{Number(event.user_rating || event.avg_rating || 0).toFixed(1)} ({event.total_ratings || 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {event.user_registration_status ? (
                        <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${registrationStatusClass[event.user_registration_status] || registrationStatusClass.confirmed}`}>
                          {getRegistrationLabel(event.user_registration_status)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {isFull ? 'Full, waitlist on registration' : 'Open for registration'}
                        </span>
                      )}

                      {event.user_rating ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          You rated {event.user_rating}/5
                        </span>
                      ) : null}

                      {event.registration_deadline ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                          Deadline {formatShortDate(event.registration_deadline)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => openDetails(event)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        View details
                      </button>

                      {event.created_by === user?.userId ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 border border-blue-200 cursor-not-allowed opacity-75"
                        >
                          You're the organizer
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      ) : event.user_registration_status && event.user_registration_status !== 'cancelled' ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRegistration(event.event_id)}
                          disabled={isPendingAction}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPendingAction ? 'Updating...' : 'Cancel registration'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRegister(event.event_id)}
                          disabled={isPendingAction}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPendingAction ? 'Submitting...' : getButtonLabel(event)}
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            {detailsLoading ? (
              <div className="flex min-h-[360px] items-center justify-center p-8 text-slate-600">Loading event details...</div>
            ) : (
              <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative">
                  <img
                    src={selectedEvent.thumbnail_url || '/vite.svg'}
                    alt={selectedEvent.title}
                    className="h-full w-full object-cover lg:min-h-[640px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
                  <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                    aria-label="Close event details"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-950">
                        {selectedEvent.category || 'event'}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${registrationStatusClass[selectedEvent.user_registration_status] || 'border-white/15 bg-white/10 text-white'}`}>
                        {selectedEvent.user_registration_status ? getRegistrationLabel(selectedEvent.user_registration_status) : 'Open'}
                      </span>
                      {selectedEvent.visibility === 'society_only' && (
                        <span className="rounded-full border border-purple-300 bg-purple-500/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                          Society only
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-3xl font-bold leading-tight">{selectedEvent.title}</h3>
                    <p className="mt-2 text-sm text-slate-200">{selectedEvent.society_name || 'Independent event'} · {selectedEvent.organizer_name || 'Organizer'}</p>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Event details</p>
                      <h4 className="mt-2 text-2xl font-bold text-slate-950">Overview and registration</h4>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-600">{selectedEvent.description || 'No description provided.'}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Date & time</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(selectedEvent.start_datetime)}</p>
                      <p className="mt-1 text-xs text-slate-500">Ends {formatDateTime(selectedEvent.end_datetime)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Location</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEvent.location || 'Not set'}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedEvent.society_name || 'Campus organizer'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Capacity</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEvent.capacity ?? 'Unlimited'}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedEvent.spots_left === null || selectedEvent.spots_left === undefined ? 'No limit set' : `${selectedEvent.spots_left} remaining`}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Average rating</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{Number(selectedEvent.avg_rating || 0).toFixed(1)} / 5</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedEvent.total_ratings || 0} reviews</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {selectedEvent.registration_deadline ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        Registration deadline: {formatDateTime(selectedEvent.registration_deadline)}
                      </span>
                    ) : null}
                    {selectedEvent.spots_left !== null && selectedEvent.spots_left !== undefined ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {selectedEvent.spots_left <= 0 ? 'Event full, waitlist enabled' : `${selectedEvent.spots_left} seats remaining`}
                      </span>
                    ) : null}
                    {selectedEvent.user_rating ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        You reviewed this event
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {selectedEvent.created_by === user?.userId ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 border border-blue-200 cursor-not-allowed opacity-75"
                      >
                        You're the organizer - You have full access to manage this event
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    ) : selectedEvent.user_registration_status && selectedEvent.user_registration_status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => handleCancelRegistration(selectedEvent.event_id)}
                        disabled={pendingActionId === selectedEvent.event_id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingActionId === selectedEvent.event_id ? 'Updating...' : 'Cancel registration'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegister(selectedEvent.event_id)}
                        disabled={pendingActionId === selectedEvent.event_id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingActionId === selectedEvent.event_id ? 'Submitting...' : getButtonLabel(selectedEvent)}
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Post event</p>
                        <h5 className="mt-2 text-lg font-bold text-slate-950">Rate and review</h5>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {canRateSelectedEvent ? 'Review enabled' : 'Available after attendance'}
                      </div>
                    </div>

                    {selectedEvent.user_rating ? (
                      <p className="mt-3 text-sm font-semibold text-emerald-700">Current rating: {selectedEvent.user_rating}/5</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-bold transition ${rating >= star ? 'border-amber-300 bg-amber-400 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={review}
                      onChange={(event) => setReview(event.target.value)}
                      rows="4"
                      placeholder="Write your event review"
                      className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    />

                    <button
                      type="button"
                      onClick={handleRateEvent}
                      disabled={!canRateSelectedEvent || submittingRating}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingRating ? 'Submitting...' : selectedEvent.user_rating ? 'Update review' : 'Submit review'}
                    </button>

                    {!canRateSelectedEvent ? (
                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        You can submit a review after attending the event, or once it has ended with your registration confirmed.
                      </p>
                    ) : null}
                  </div>

                  {eventReviews.length > 0 && (
                    <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <StarIcon className="h-5 w-5 text-amber-500" />
                        <h5 className="text-lg font-bold text-slate-950">Anonymous Reviews</h5>
                      </div>
                      <div className="mt-4 space-y-4">
                        {eventReviews.map((r, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <StarIcon key={star} className={`h-4 w-4 ${r.stars >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                              ))}
                              <span className="ml-2 text-xs font-semibold text-slate-500">{formatShortDate(r.created_at)}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{r.review}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default Events
