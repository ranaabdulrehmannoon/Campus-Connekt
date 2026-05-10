import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  BellIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  FunnelIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/useAuth'

const categoryConfig = {
  all: { label: 'All notifications', icon: BellIcon },
  event_registration: { label: 'Event registration', icon: CalendarDaysIcon },
  event_reminder: { label: 'Event reminders', icon: SparklesIcon },
  resource_approval: { label: 'Resource approval', icon: ShieldCheckIcon },
  society_announcement: { label: 'Society announcements', icon: MegaphoneIcon },
  approval: { label: 'Approvals', icon: ShieldCheckIcon },
}

const roleGuidance = {
  student: 'Students receive event confirmations, reminders, and society announcements they are part of.',
  society_admin: 'Society admins receive event registrations, member updates, and society notices.',
  admin: 'Admins receive approval queues for societies and resources, plus system-level alerts.',
}

const formatRelativeTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffInMinutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.round(diffInMinutes / 60)}h ago`
  return `${Math.round(diffInMinutes / 1440)}d ago`
}

const getNotificationTarget = (notification) => {
  if (notification.reference_type === 'user') {
    return '/admin/users?approval=pending'
  }

  if (notification.reference_type === 'resource') {
    return notification.reference_id ? `/resource/${notification.reference_id}` : '/resources'
  }

  if (notification.reference_type === 'society') {
    return notification.reference_id ? `/society/${notification.reference_id}` : '/societies'
  }

  if (notification.reference_type === 'event') {
    return '/events'
  }

  if (notification.category === 'resource_approval') {
    return '/approve-resources'
  }

  if (notification.category === 'approval') {
    return '/admin/pending-approvals'
  }

  if (notification.category === 'society_announcement') {
    return '/societies'
  }

  return '/notifications'
}

const Notifications = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [summary, setSummary] = useState({ unreadCount: 0, totalCount: 0 })
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (category !== 'all') params.set('category', category)
      if (unreadOnly) params.set('unreadOnly', 'true')

      const response = await axios.get(`/api/notifications?${params.toString()}`)
      setNotifications(response.data.notifications || [])
      setSummary(response.data.summary || { unreadCount: 0, totalCount: 0 })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [category, unreadOnly])

  const groupedNotifications = useMemo(() => {
    return notifications.reduce((accumulator, notification) => {
      const bucket = notification.category || 'general'
      if (!accumulator[bucket]) accumulator[bucket] = []
      accumulator[bucket].push(notification)
      return accumulator
    }, {})
  }, [notifications])

  const handleMarkAllRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all')
      setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })))
      setSummary((current) => ({ ...current, unreadCount: 0 }))
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update notifications')
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`)
      setNotifications((current) => current.map((item) => (item.notification_id === id ? { ...item, is_read: 1 } : item)))
      setSummary((current) => ({ ...current, unreadCount: Math.max((current.unreadCount || 0) - 1, 0) }))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update notification')
    }
  }

  const handleOpenNotification = async (notification) => {
    const target = getNotificationTarget(notification)

    if (!notification.is_read) {
      try {
        await axios.patch(`/api/notifications/${notification.notification_id}/read`)
        setNotifications((current) => current.map((item) => (item.notification_id === notification.notification_id ? { ...item, is_read: 1 } : item)))
        setSummary((current) => ({ ...current, unreadCount: Math.max((current.unreadCount || 0) - 1, 0) }))
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update notification')
        return
      }
    }

    navigate(target)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-7 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Workspace notifications</p>
            <h1 className="mt-2 text-3xl font-bold">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              {roleGuidance[user?.role] || 'Notifications tailored to your current role.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Unread</p>
              <p className="mt-1 text-2xl font-bold">{summary.unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Total</p>
              <p className="mt-1 text-2xl font-bold">{summary.totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon
            const active = category === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setUnreadOnly((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${unreadOnly ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          <FunnelIcon className="h-4 w-4" />
          {unreadOnly ? 'Showing unread only' : 'Show unread only'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
            <p className="text-sm text-slate-600">Mark items read one by one or clear the entire list.</p>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="mt-4 space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification.notification_id}
                className={`rounded-3xl border p-5 transition ${notification.is_read ? 'border-slate-200 bg-slate-50/80' : 'border-blue-200 bg-blue-50/40'}`}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleOpenNotification(notification)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {notification.category?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{notification.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleMarkRead(notification.notification_id)
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Mark read
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{formatRelativeTime(notification.created_at)}</span>
                  <span>{notification.is_read ? 'Read' : 'Unread'}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <BellIcon className="h-10 w-10 text-slate-400" />
            <p className="mt-4 text-lg font-semibold text-slate-900">No notifications found</p>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              {unreadOnly ? 'You do not have unread notifications for this filter.' : 'New activity will appear here as it happens.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default Notifications