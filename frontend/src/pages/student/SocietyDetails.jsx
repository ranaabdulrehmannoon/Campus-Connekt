import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  MegaphoneIcon,
  UserGroupIcon,
  UsersIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/useAuth'

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
  if (!value) return 'Soon'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const diffHours = Math.round((date.getTime() - Date.now()) / 3600000)
  if (Math.abs(diffHours) < 1) return 'Now'
  if (diffHours < 0) return `${Math.abs(diffHours)}h ago`
  if (diffHours < 24) return `In ${diffHours}h`
  return `In ${Math.round(diffHours / 24)}d`
}

const SocietyDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState(null)
  const [announcementText, setAnnouncementText] = useState('')
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)

  const loadSociety = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/societies/${id}`)
      setData(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load society details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadSociety()
  }, [loadSociety])

  const handleJoin = async () => {
    setSubmitting(true)
    try {
      const response = await axios.post(`/api/societies/${id}/join`)
      toast.success(response.data.message || 'Joined society')
      await loadSociety()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join society')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this society?')) return

    setSubmitting(true)
    try {
      const response = await axios.delete(`/api/societies/${id}/join`)
      toast.success(response.data.message || 'Left society')
      await loadSociety()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave society')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSociety = async () => {
    if (!window.confirm('Are you sure you want to delete this society? This action cannot be undone.')) return

    setSubmitting(true)
    try {
      const response = await axios.delete(`/api/societies/${id}`)
      toast.success(response.data.message || 'Society deleted')
      navigate('/societies')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete society')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementText.trim()) {
      toast.error('Please enter announcement text')
      return
    }

    setSubmittingAnnouncement(true)
    try {
      await axios.post(`/api/societies/${id}/announcements`, {
        title: 'New Announcement',
        content: announcementText,
      })
      toast.success('Announcement posted')
      setAnnouncementText('')
      setShowAnnouncementForm(false)
      await loadSociety()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post announcement')
    } finally {
      setSubmittingAnnouncement(false)
    }
  }

  const actionLabel = useMemo(() => {
    if (!data?.society) return 'Join society'
    if (data.society.is_joined) return 'Leave society'
    if (data.society.had_membership) return 'Rejoin society'
    return 'Join society'
  }, [data])

  if (loading) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">Loading society details...</div>
  }

  if (!data?.society) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Society not found.</div>
  }

  const { society, announcements = [], events = [], members = [] } = data
  const openEvents = events.filter((event) => event.status === 'open')
  const isCreator = society.is_creator
  const canManageContent = society.can_manage_content
  const canManageSociety = user?.role === 'admin' && isCreator

  return (
    <section className="space-y-6 pb-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 sm:p-10">
            <div className="absolute inset-0 opacity-50">
              <div className="absolute left-10 top-8 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
              <div className="absolute right-10 top-20 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
            </div>
            <div className="relative space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 backdrop-blur-sm shadow-sm">
                <UserGroupIcon className="h-4 w-4" />
                Society profile
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {society.logo_url && (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.5rem] border-2 border-white bg-white shadow-xl">
                    <img
                      src={society.logo_url.startsWith('http') ? society.logo_url : society.logo_url}
                      alt={`${society.name} logo`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(society.name) + '&background=0D8ABC&color=fff'
                      }}
                    />
                  </div>
                )}
                <div>
                  <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{society.name}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{society.description || 'No description provided.'}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Members', value: society.member_count || 0 },
                  { label: 'Events', value: events.length },
                  { label: 'Announcements', value: announcements.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white/40 p-8 backdrop-blur-sm lg:border-l lg:border-t-0">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              {canManageSociety ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 mb-3">Creator Controls</p>
                    <div className="flex flex-col gap-2">
                      <Link
                        to={`/society/${id}/edit`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Edit Society
                      </Link>
                      <button
                        onClick={handleDeleteSociety}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete Society
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Membership</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Category</p>
                        <p className="mt-1 text-sm text-slate-600">{society.category || 'other'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Your status</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {society.is_joined ? 'Active member' : society.had_membership ? 'Previously left, can rejoin' : 'Not a member yet'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {society.is_joined ? (
                        <button
                          type="button"
                          onClick={handleLeave}
                          disabled={submitting}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting ? 'Updating...' : 'Leave society'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleJoin}
                          disabled={submitting}
                          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting ? 'Updating...' : actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isCreator && (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: 'Joined', value: society.is_joined ? 'Yes' : 'No', icon: UsersIcon },
            { label: 'Status', value: society.is_joined ? 'Active membership' : society.had_membership ? 'Eligible to rejoin' : 'Open to join', icon: ClockIcon },
            { label: 'Member role', value: society.member_role || society.membership_history_role || 'Member', icon: CalendarDaysIcon },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Updates</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Announcements</h2>
              </div>
              <MegaphoneIcon className="h-7 w-7 text-slate-400" />
            </div>

            {canManageContent && (
              <div className="mt-5">
                {!showAnnouncementForm ? (
                  <button
                    onClick={() => setShowAnnouncementForm(true)}
                    className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    + Create Announcement
                  </button>
                ) : (
                  <form onSubmit={handleCreateAnnouncement} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Write an announcement..."
                      rows="3"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAnnouncementForm(false)}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAnnouncement}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <CheckIcon className="h-4 w-4" />
                        {submittingAnnouncement ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <article key={announcement.announcement_id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{announcement.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{announcement.content}</p>
                      </div>
                      {announcement.is_pinned ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">Pinned</span> : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Posted by {announcement.posted_by_name} · {formatDateTime(announcement.created_at)}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No announcements yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Events</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Upcoming and recent events</h2>
              </div>
              <CalendarDaysIcon className="h-7 w-7 text-slate-400" />
            </div>

            {canManageContent && (
              <div className="mt-5">
                <Link
                  to={`/create-event?society=${id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  + Create Event
                </Link>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {events.length > 0 ? (
                events.map((event) => (
                  <article key={event.event_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{event.description || 'No description provided.'}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {event.category || 'event'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-blue-600" /> {formatDateTime(event.start_datetime)}
                      </p>
                      <p className="flex items-center gap-2">
                        <UserGroupIcon className="h-4 w-4 text-blue-600" /> {event.capacity ?? 'Open capacity'} · {event.spots_left === null ? 'Unlimited' : `${event.spots_left} left`}
                      </p>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{formatRelativeDate(event.start_datetime)}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No events listed yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">Community</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Members</h2>
              </div>
              <UsersIcon className="h-7 w-7 text-slate-400" />
            </div>

            <div className="mt-5 space-y-3">
              {members.length > 0 ? (
                members.map((member) => (
                  <article key={member.membership_id} className="rounded-3xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">{member.first_name} {member.last_name}</p>
                    <p className="text-sm text-slate-600">{member.role}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No members yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default SocietyDetails
