import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  FireIcon,
  MapPinIcon,
  MegaphoneIcon,
  SparklesIcon,
  UsersIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline'

const formatDateTime = (value) => {
  if (!value) return 'Date not set'
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
  const diffInHours = Math.round((date.getTime() - Date.now()) / 3600000)
  if (diffInHours < 0) return 'Started'
  if (diffInHours < 24) return `In ${diffInHours}h`
  return `In ${Math.round(diffInHours / 24)}d`
}

const cardTone = [
  'from-sky-500 to-cyan-500',
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
]

const StudentDashboard = ({ summary, loading, user }) => {
  const metrics = summary?.metrics || []
  const upcomingEvents = summary?.upcomingEvents || []
  const latestAnnouncements = summary?.latestAnnouncements || []
  const recommendedEvents = summary?.recommendedEvents || []
  const trendingEvents = summary?.trendingEvents || []
  const joinedSocieties = summary?.joinedSocieties || []

  const metricCards = useMemo(
    () => metrics.map((metric, index) => ({ ...metric, tone: cardTone[index % cardTone.length] })),
    [metrics]
  )

  return (
    <section className="space-y-6 pb-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Student dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {user?.firstName ? `Good to see you, ${user.firstName}` : 'Student overview'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Quick access to events, societies, announcements, and your current activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/events" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Events
            </Link>
            <Link to="/societies" className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Societies
            </Link>
            <Link to="/notifications" className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Notifications
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {[
            { label: 'Joined societies', value: joinedSocieties.length },
            { label: 'Upcoming events', value: upcomingEvents.length },
            { label: 'Unread alerts', value: metrics[3]?.value ?? 0 },
            { label: 'Total activity', value: metrics[0]?.value ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon || SparklesIcon
          return (
            <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{metric.value}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Events</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Upcoming events</h2>
              </div>
              <Link to="/events" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                Browse all events
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2">
                  Loading upcoming events...
                </div>
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <article key={event.event_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-blue-200 hover:bg-blue-50/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{event.description || 'No description provided.'}</p>
                      </div>
                      {event.user_registration_status ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          Registered
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-blue-600" /> {formatDateTime(event.start_datetime)}</p>
                      <p className="flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-blue-600" /> {event.location || 'Location to be announced'}</p>
                      <p className="flex items-center gap-2"><UsersIcon className="h-4 w-4 text-blue-600" /> {event.society_name || 'Independent event'} · {event.registered_count || 0} registrations</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {event.spots_left === null || event.spots_left === undefined ? 'Open capacity' : `${event.spots_left} spots left`}
                      </div>
                      <Link to="/events" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Join event
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2">
                  No upcoming events at the moment.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">Recommendations</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Recommended for you</h2>
              </div>
              <Link to="/societies" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                Explore societies
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2">
                  Loading recommendations...
                </div>
              ) : recommendedEvents.length > 0 ? (
                recommendedEvents.map((event) => (
                  <article key={event.event_id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{event.society_name || 'Independent event'}</p>
                      </div>
                      <div className="rounded-2xl bg-violet-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                        {event.category || 'event'}
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm text-slate-600">{event.description || 'Recommended because it matches your current campus activity.'}</p>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2"><ClockIcon className="h-4 w-4 text-violet-600" /> {formatRelativeDate(event.start_datetime)}</span>
                      <Link to="/events" className="font-semibold text-blue-700 hover:text-blue-800">Join event</Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2">
                  No recommendations yet. Join a society to unlock personalized event suggestions.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">Trending</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Trending events</h2>
              </div>
              <Link to="/events" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                Discover more
              </Link>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 lg:col-span-2">
                  Loading trending events...
                </div>
              ) : trendingEvents.length > 0 ? (
                trendingEvents.map((event, index) => (
                  <article key={event.event_id} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <FireIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">#{index + 1}</span>
                          <p className="font-semibold text-slate-900">{event.title}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{event.society_name || 'Independent event'} · {event.registered_count || 0} registrations</p>
                      </div>
                    </div>
                    <Link to="/events" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      View
                    </Link>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 lg:col-span-2">
                  Trending events will appear here once registrations pick up.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">Announcements</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Latest updates</h2>
              </div>
              <MegaphoneIcon className="h-6 w-6 text-rose-500" />
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Loading announcements...
                </div>
              ) : latestAnnouncements.length > 0 ? (
                latestAnnouncements.map((announcement) => (
                  <article key={announcement.announcement_id} className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-600">{announcement.society_name}</p>
                        <h3 className="mt-2 text-base font-semibold text-slate-900">{announcement.title}</h3>
                      </div>
                      {announcement.is_pinned ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-700">Pinned</span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600">{announcement.content}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>Posted by {announcement.posted_by_name}</span>
                      <span>{formatDateTime(announcement.created_at)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No announcements yet from the societies you joined.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Communities</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Joined societies</h2>
            </div>

            <div className="mt-5 space-y-3">
              {joinedSocieties.length > 0 ? (
                joinedSocieties.map((society) => (
                  <div key={society.society_id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{society.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{society.category || 'Society'}</p>
                      </div>
                      <UsersIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold uppercase tracking-[0.18em]">{society.role}</span>
                      <Link to={`/society/${society.society_id}`} className="font-semibold text-blue-700 hover:text-blue-800">
                        View society
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  You have not joined any societies yet. Browse communities to unlock announcements and recommendations.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default StudentDashboard
