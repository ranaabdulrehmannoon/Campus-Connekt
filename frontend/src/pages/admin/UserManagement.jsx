import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import {
  ArrowPathIcon,
  BellAlertIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

const roleOptions = ['all', 'student', 'society_admin', 'admin']
const assignableRoleOptions = ['student', 'society_admin']
const statusOptions = ['all', 'active', 'inactive']
const approvalOptions = ['all', 'pending', 'approved', 'rejected']

const UserManagement = () => {
  const location = useLocation()
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [users, setUsers] = useState([])
  const [roleBreakdown, setRoleBreakdown] = useState([])
  const [filters, setFilters] = useState({ role: 'all', status: 'all', approvalStatus: 'all', search: '' })

  const [activityLoading, setActivityLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activity, setActivity] = useState([])

  const [auditLoading, setAuditLoading] = useState(true)
  const [audit, setAudit] = useState([])
  const [auditActionFilter, setAuditActionFilter] = useState('')

  const [systemLoading, setSystemLoading] = useState(false)
  const [globalMessage, setGlobalMessage] = useState({ title: '', message: '', type: 'general' })

  const [issuesLoading, setIssuesLoading] = useState(true)
  const [issues, setIssues] = useState([])

  const totalUsers = useMemo(
    () => roleBreakdown.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [roleBreakdown]
  )

  const pendingApprovalsCount = useMemo(
    () => users.filter((item) => item.approval_status === 'pending').length,
    [users]
  )

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const params = new URLSearchParams()
      params.set('role', filters.role)
      params.set('status', filters.status)
      params.set('approvalStatus', filters.approvalStatus)
      if (filters.search.trim()) params.set('search', filters.search.trim())

      const response = await axios.get(`/api/admin/users?${params.toString()}`)
      setUsers(response.data?.users || [])
      setRoleBreakdown(response.data?.roleBreakdown || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchAudit = async () => {
    setAuditLoading(true)
    try {
      const params = new URLSearchParams()
      if (auditActionFilter.trim()) params.set('action', auditActionFilter.trim())

      const response = await axios.get(`/api/admin/audit?${params.toString()}`)
      setAudit(response.data?.audit || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load audit logs')
    } finally {
      setAuditLoading(false)
    }
  }

  const fetchIssues = async () => {
    setIssuesLoading(true)
    try {
      const response = await axios.get('/api/admin/issues?status=all')
      setIssues(response.data?.issues || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load reported issues')
    } finally {
      setIssuesLoading(false)
    }
  }

  const fetchActivity = async (user) => {
    setSelectedUser(user)
    setActivityLoading(true)
    try {
      const response = await axios.get(`/api/admin/users/${user.user_id}/activity`)
      setActivity(response.data?.activity || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load user activity')
    } finally {
      setActivityLoading(false)
    }
  }

  const handleToggleUserStatus = async (user) => {
    const nextStatus = !Boolean(user.is_active)
    try {
      await axios.patch(`/api/admin/users/${user.user_id}/status`, { isActive: nextStatus })
      toast.success(`User ${nextStatus ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status')
    }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/role`, { role })
      toast.success('User role updated successfully')
      fetchUsers()
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user role')
    }
  }

  const handleApprovalDecision = async (user, decision) => {
    try {
      const response = await axios.patch(`/api/admin/users/${user.user_id}/approval`, { decision })
      toast.success(response.data?.message || `User ${decision}d successfully`)
      fetchUsers()
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${decision} account`)
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Delete account for ${user.email}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await axios.delete(`/api/admin/users/${user.user_id}`)
      toast.success('User deleted successfully')
      fetchUsers()
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleSendGlobalNotification = async (event) => {
    event.preventDefault()
    setSystemLoading(true)

    try {
      const response = await axios.post('/api/admin/notifications/global', globalMessage)
      toast.success(`Notification sent to ${response.data?.recipientCount || 0} users`)
      setGlobalMessage({ title: '', message: '', type: 'general' })
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send global notification')
    } finally {
      setSystemLoading(false)
    }
  }

  const handleIssueStatus = async (issueId, status) => {
    try {
      await axios.patch(`/api/admin/issues/${issueId}/status`, { status })
      toast.success('Issue status updated')
      fetchIssues()
      fetchAudit()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update issue status')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filters.role, filters.status, filters.approvalStatus, filters.search])

  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const approval = query.get('approval')
    if (approval && approvalOptions.includes(approval)) {
      setFilters((current) => ({ ...current, approvalStatus: approval }))
    }
  }, [location.search])

  useEffect(() => {
    fetchAudit()
  }, [auditActionFilter])

  useEffect(() => {
    fetchIssues()
  }, [])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin identity</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-slate-600">Manage users, review audits, and run system controls from one page.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchUsers()
              fetchAudit()
              fetchIssues()
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800">Total active users</p>
            <UserGroupIcon className="h-5 w-5 text-blue-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-900">{totalUsers}</p>
        </article>

        <article className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-800">Pending organizer approvals</p>
            <ShieldExclamationIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-indigo-900">{pendingApprovalsCount}</p>
        </article>

        <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-rose-800">Open reported issues</p>
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {issues.filter((item) => item.status === 'open').length}
          </p>
        </article>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto md:grid-cols-5">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                placeholder="Search users"
              />
            </div>
            <select
              value={filters.role}
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {roleOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={filters.approvalStatus}
              onChange={(event) => setFilters((current) => ({ ...current, approvalStatus: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {approvalOptions.map((item) => (
                <option key={item} value={item}>approval: {item}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchUsers}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </div>

        {loadingUsers ? (
          <p className="mt-4 text-sm text-slate-600">Loading users...</p>
        ) : users.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="py-3 pr-4 font-semibold">User</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Approval</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Last login</th>
                  <th className="py-3 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.user_id} className="border-b border-slate-100 last:border-none">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-800">{item.first_name} {item.last_name}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {item.role === 'admin' ? (
                        <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          admin (locked)
                        </span>
                      ) : (
                        <select
                          value={item.role}
                          onChange={(event) => handleRoleChange(item.user_id, event.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          {assignableRoleOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.approval_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.approval_status || 'approved'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600">
                      {item.last_login ? new Date(item.last_login).toLocaleString() : 'never'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(item)}
                          disabled={item.role === 'admin'}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${item.is_active ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                        >
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {item.approval_status === 'pending' && item.requested_role === 'society_admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovalDecision(item, 'approve')}
                              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              Approve organizer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprovalDecision(item, 'reject')}
                              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700"
                            >
                              Reject request
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => fetchActivity(item)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          View activity
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(item)}
                          disabled={item.role === 'admin'}
                          className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        >
                          Delete user
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No users found for the selected filters.
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">User activity</h2>
            <UserCircleIcon className="h-5 w-5 text-slate-500" />
          </div>
          {!selectedUser ? (
            <p className="mt-4 text-sm text-slate-500">Select a user and click "View activity" to inspect timeline events.</p>
          ) : activityLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading activity for {selectedUser.email}...</p>
          ) : (
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {activity.length > 0 ? activity.map((item) => (
                <article key={`${item.activity_type}-${item.reference_id}-${item.created_at}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.activity_type}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                </article>
              )) : (
                <p className="text-sm text-slate-500">No activity available for this user.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Audit history</h2>
            <ShieldExclamationIcon className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={auditActionFilter}
              onChange={(event) => setAuditActionFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Filter by action (e.g., role_changed)"
            />
            <button
              type="button"
              onClick={fetchAudit}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Search
            </button>
          </div>

          {auditLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading audit logs...</p>
          ) : (
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {audit.length > 0 ? audit.map((log) => (
                <article key={log.log_id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                    <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Actor: {log.actor_name || log.actor_email || 'System'}</p>
                  <p className="mt-1 text-xs text-slate-600">Target: {log.table_name}#{log.record_id}</p>
                </article>
              )) : (
                <p className="text-sm text-slate-500">No audit logs found for this filter.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">System control</h2>
            <BellAlertIcon className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-2 text-sm text-slate-600">Send a global notification to all active users.</p>

          <form className="mt-4 space-y-3" onSubmit={handleSendGlobalNotification}>
            <input
              value={globalMessage.title}
              onChange={(event) => setGlobalMessage((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Notification title"
              required
            />
            <textarea
              value={globalMessage.message}
              onChange={(event) => setGlobalMessage((current) => ({ ...current, message: event.target.value }))}
              className="h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Notification message"
              required
            />
            <select
              value={globalMessage.type}
              onChange={(event) => setGlobalMessage((current) => ({ ...current, type: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="general">general</option>
              <option value="admin_alert">admin_alert</option>
            </select>
            <button
              disabled={systemLoading}
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              {systemLoading ? 'Sending...' : 'Send global notification'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Reported issues</h2>
            <ClockIcon className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-2 text-sm text-slate-600">Optional extension: monitor and resolve issues reported in the system.</p>

          {issuesLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading issues...</p>
          ) : issues.length > 0 ? (
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {issues.map((issue) => (
                <article key={issue.issue_id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{issue.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{issue.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleIssueStatus(issue.issue_id, 'in_progress')}
                      className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700"
                    >
                      Mark in progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIssueStatus(issue.issue_id, 'resolved')}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      Mark resolved
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No reported issues found.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default UserManagement
