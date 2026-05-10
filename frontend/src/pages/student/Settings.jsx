import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ClockIcon, KeyIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const actionLabels = {
  profile_updated: 'Profile updated',
  password_changed: 'Password changed',
  security_questions_updated: 'Security questions updated',
  forgot_password_security_verified: 'Password recovery verified',
}

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [savingPassword, setSavingPassword] = useState(false)
  const [audit, setAudit] = useState([])
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const resolvedAudit = useMemo(
    () => audit.map((item) => ({ ...item, label: actionLabels[item.action] || item.action?.replaceAll('_', ' ') || 'Activity' })),
    [audit]
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const auditResponse = await axios.get('/api/auth/audit')

      setAudit(auditResponse.data.audit || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load settings data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all password fields')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }

    setSavingPassword(true)
    try {
      const response = await axios.patch('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      toast.success(response.data.message || 'Password changed')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }



  if (loading) {
    return (
      <section className="w-full space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading settings...</div>
      </section>
    )
  }

  return (
    <section className="w-full space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_38%)] pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Security center</p>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">Manage password protection and your account audit activity.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handlePasswordSubmit} className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md space-y-5 group">
          <div className="absolute -right-8 -top-8 opacity-[0.03] transition-opacity group-hover:opacity-[0.06] pointer-events-none">
            <KeyIcon className="h-48 w-48 text-slate-900" />
          </div>
          <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-200">
              <KeyIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Change password</h2>
              <p className="text-sm text-slate-500 mt-0.5">Use your current password to set a new one.</p>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <input
              type="password"
              placeholder="Current password"
              value={passwordData.currentPassword}
              onChange={(event) => setPasswordData((current) => ({ ...current, currentPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
            <input
              type="password"
              placeholder="New password"
              value={passwordData.newPassword}
              onChange={(event) => setPasswordData((current) => ({ ...current, newPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordData.confirmPassword}
              onChange={(event) => setPasswordData((current) => ({ ...current, confirmPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="relative z-10 mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LockClosedIcon className="h-5 w-5" />
            {savingPassword ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        {/* Security questions removed per request */}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm group">
        <div className="absolute right-0 top-0 opacity-[0.02] transition-opacity group-hover:opacity-[0.04] pointer-events-none translate-x-1/4 -translate-y-1/4">
          <ClockIcon className="h-64 w-64 text-blue-900" />
        </div>
        
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200">
            <ClockIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Audit timeline</h2>
            <p className="text-sm text-slate-500 mt-0.5">Recent profile and security actions on your account.</p>
          </div>
        </div>

        {resolvedAudit.length > 0 ? (
          <div className="relative z-10 mt-6 space-y-3 max-h-[400px] overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
            {resolvedAudit.map((item) => (
              <article key={item.log_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 transition-colors hover:bg-slate-50 hover:border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <p className="text-sm font-bold tracking-wide text-slate-700">{item.label}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  <p className="text-xs text-slate-500"><span className="font-semibold text-slate-600">Table:</span> {item.table_name}</p>
                  <p className="text-xs text-slate-500"><span className="font-semibold text-slate-600">Record ID:</span> {item.record_id}</p>
                  {item.ip_address && <p className="text-xs text-slate-500"><span className="font-semibold text-slate-600">IP:</span> {item.ip_address}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="relative z-10 mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">No audit entries yet.</div>
        )}
      </div>
    </section>
  )
}

export default Settings
