import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  BellIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const iconByCategory = {
  event_registration: CalendarDaysIcon,
  event_reminder: BellIcon,
  resource_approval: ShieldCheckIcon,
  society_announcement: MegaphoneIcon,
  approval: ShieldCheckIcon,
  general: BellIcon,
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
  // For admin approval notifications, always go to pending approvals
  if (notification.type === 'admin_alert' || notification.category === 'admin_alert' || 
      (notification.type && notification.type.includes('approval') && notification.reference_type !== 'registration')) {
    return '/admin/pending-approvals'
  }

  if (notification.reference_type === 'user') {
    return '/admin/users?approval=pending'
  }

  if (notification.reference_type === 'announcement') {
    return '/societies'
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
    return '/admin/pending-approvals'
  }

  if (notification.category === 'approval' || notification.category === 'admin_alert') {
    return '/admin/pending-approvals'
  }

  if (notification.category === 'society_announcement') {
    return '/societies'
  }

  return '/notifications'
}

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [summary, setSummary] = useState({ unreadCount: 0 })
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/notifications?limit=10')
      setNotifications(response.data.notifications || [])
      setSummary(response.data.summary || { unreadCount: 0 })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  const unreadCount = summary.unreadCount || notifications.filter((item) => !item.is_read).length

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

    setIsOpen(false)
    navigate(target)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl z-20">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Notifications</div>
                  <div className="mt-1 text-xs text-slate-500">Role-aware updates from events, societies, and approvals</div>
                </div>
                <Link to="/notifications" onClick={() => setIsOpen(false)} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                  View all
                </Link>
              </div>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {loading ? (
                <div className="px-5 py-6 text-sm text-slate-500">Loading notifications...</div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => {
                    const Icon = iconByCategory[notification.category] || BellIcon

                    return (
                      <button
                        key={notification.notification_id}
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 ${notification.is_read ? 'opacity-70' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                              </div>
                              {!notification.is_read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold uppercase tracking-[0.18em]">
                                {notification.category?.replace('_', ' ')}
                              </span>
                              <span>{formatRelativeTime(notification.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-sm text-slate-600">
                  No notifications right now.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">Tap a notification to mark it read.</p>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationDropdown
