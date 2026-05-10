import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import StudentDashboard from './student/StudentDashboard'
import AdminDashboard from './admin/AdminDashboard'

const metricGridClass = 'grid gap-4 md:grid-cols-2 xl:grid-cols-4'

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    const loadSummary = async () => {
      if (!user) return

      setLoading(true)
      try {
        const response = await axios.get('/api/dashboard/summary')
        setSummary(response.data)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dashboard summary')
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
    const refreshInterval = user?.role === 'admin' ? setInterval(loadSummary, 30000) : null

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [user])

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'Dashboard'
    return `${user.role.replace('_', ' ')} dashboard`
  }, [user])

  const isOrganizer = user?.role === 'society_admin'

  if (authLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading dashboard...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === 'admin') {
    return <AdminDashboard loading={loading} summary={summary} user={user} />
  }

  const metrics = summary?.metrics || []
  const recentItems = summary?.recentItems || []
  const breakdowns = summary?.breakdowns || {}

  if (user?.role === 'student') {
    return <StudentDashboard loading={loading} summary={summary} user={user} />
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{roleLabel}</h1>
          <p className="mt-1 text-slate-600">A quick snapshot of activity tailored to your role.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOrganizer ? (
            <>
              <Link to="/create-event" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Create event
              </Link>
              <Link to="/manage-events" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Manage events
              </Link>
            </>
          ) : (
            <Link to="/resources" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Browse resources
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading analytics...</div>
      ) : (
        <>
          <div className={metricGridClass}>
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>

          {isOrganizer && breakdowns.eventsByStatus && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Event status</h2>
                <div className="mt-4 space-y-3">
                  {breakdowns.eventsByStatus.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium capitalize text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Most popular events</h2>
                <div className="mt-4 space-y-3">
                  {breakdowns.popularEvents?.length > 0 ? breakdowns.popularEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-600">{event.subtitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.meta}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">No event popularity data yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {breakdowns.usersByRole && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Users by role</h2>
                <div className="mt-4 space-y-3">
                  {breakdowns.usersByRole.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Events by status</h2>
                <div className="mt-4 space-y-3">
                  {breakdowns.eventsByStatus?.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {recentItems.length > 0 ? recentItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.subtitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No recent activity available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default Dashboard