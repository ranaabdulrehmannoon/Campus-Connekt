import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  CameraIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const emptyForm = {
  firstName: '',
  lastName: '',
  department: '',
  batchYear: '',
  bio: '',
  phone: '',
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const statusColor = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  attended: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const Profile = () => {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [joinedEvents, setJoinedEvents] = useState([])
  const [uploadedResources, setUploadedResources] = useState([])
  const [societyMemberships, setSocietyMemberships] = useState([])
  const [activityHistory, setActivityHistory] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)

  const displayName = useMemo(
    () =>
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      user?.username ||
      'User',
    [profile, user]
  )

  const roleLabel = useMemo(
    () => profile?.role?.replace('_', ' ') || user?.role?.replace('_', ' ') || 'Member',
    [profile, user]
  )

  const initials = useMemo(() => {
    const parts = displayName.split(' ')
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  const stats = useMemo(() => {
    const attended = joinedEvents.filter(
      (item) => String(item.status || '').toLowerCase() === 'attended'
    ).length
    return {
      eventsAttended: attended,
      resourcesUploaded: uploadedResources.length,
      societiesJoined: societyMemberships.filter((item) => item.is_active).length,
      totalActivity: activityHistory.length,
    }
  }, [joinedEvents, uploadedResources, societyMemberships, activityHistory])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await axios.get('/api/auth/profile')
        const {
          profile: profileData,
          joinedEvents: joinedEventsData,
          uploadedResources: uploadedResourcesData,
          societyMemberships: societyMembershipsData,
          activityHistory: activityHistoryData,
        } = response.data

        setProfile(profileData)
        setJoinedEvents(joinedEventsData || [])
        setUploadedResources(uploadedResourcesData || [])
        setSocietyMemberships(societyMembershipsData || [])
        setActivityHistory(activityHistoryData || [])
        setFormData({
          firstName: profileData?.first_name || '',
          lastName: profileData?.last_name || '',
          department: profileData?.department || '',
          batchYear: profileData?.batch_year || '',
          bio: profileData?.bio || '',
          phone: profileData?.phone || '',
        })
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await axios.put('/api/auth/profile', {
        ...formData,
        batchYear: formData.batchYear ? Number(formData.batchYear) : null,
      })
      setProfile(response.data.profile)
      setUser((currentUser) => ({
        ...currentUser,
        firstName: formData.firstName,
        lastName: formData.lastName,
      }))
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB')
      return
    }
    setAvatarPreview(URL.createObjectURL(file))
    handleAvatarUpload(file)
  }

  const handleAvatarUpload = async (file) => {
    setUploadingAvatar(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('avatar', file)
      const response = await axios.post('/api/auth/avatar', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile((prev) => ({ ...prev, profile_picture: response.data.avatarUrl }))
      toast.success('Profile picture updated!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload picture')
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const avatarSrc = avatarPreview || profile?.profile_picture || null

  if (loading) {
    return (
      <section className="space-y-4 pb-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 animate-pulse rounded-3xl bg-slate-100" />
            <div className="space-y-2">
              <div className="h-5 w-48 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6 pb-8">
      {/* ── Hero card ── */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 shadow-sm">
        <div className="relative p-8 sm:p-10">
          {/* Soft glows */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div className="relative shrink-0 self-start">
                <div className="h-24 w-24 overflow-hidden rounded-3xl ring-4 ring-white shadow-md">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Change profile photo"
                  className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <CameraIcon className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Identity */}
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-sm backdrop-blur-sm">
                  <CheckBadgeIcon className="h-3.5 w-3.5 text-blue-500" />
                  {roleLabel}
                </div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {profile?.email || user?.email}
                  {profile?.department ? ` · ${profile.department}` : ''}
                  {profile?.batch_year ? ` · Batch ${profile.batch_year}` : ''}
                </p>
                {profile?.bio && (
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 italic">
                    "{profile.bio}"
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditing((cur) => !cur)}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
            >
              {editing ? <XMarkIcon className="h-4 w-4" /> : <PencilSquareIcon className="h-4 w-4" />}
              {editing ? 'Close editor' : 'Edit profile'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Events attended', value: stats.eventsAttended, icon: CalendarDaysIcon, color: 'text-blue-600 bg-blue-50' },
          { label: 'Resources uploaded', value: stats.resourcesUploaded, icon: ArrowUpTrayIcon, color: 'text-violet-600 bg-violet-50' },
          { label: 'Societies joined', value: stats.societiesJoined, icon: UsersIcon, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total activity', value: stats.totalActivity, icon: ChartBarIcon, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {/* Profile details */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Info</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Profile details</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'First name', value: profile?.first_name || '—' },
                { label: 'Last name', value: profile?.last_name || '—' },
                { label: 'Department', value: profile?.department || '—' },
                { label: 'Batch year', value: profile?.batch_year || '—' },
                { label: 'Phone', value: profile?.phone || '—' },
                { label: 'Email', value: profile?.email || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 truncate">{value}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Bio</p>
                <p className="mt-1 text-sm text-slate-700 leading-6">{profile?.bio || 'No bio added yet.'}</p>
              </div>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">Editor</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Edit profile</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">First name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="Last name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Department</label>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="Department"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Batch year</label>
                  <input
                    name="batchYear"
                    value={formData.batchYear}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="e.g. 2024"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="Phone number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white resize-none"
                    placeholder="Tell us a little about yourself..."
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Joined events */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Events</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Joined events</h2>
              </div>
              <CalendarDaysIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {joinedEvents.length > 0 ? (
                joinedEvents.map((item) => (
                  <div key={item.registration_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-sm text-slate-600 truncate">
                          {item.society_name} · {item.location || 'No location'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.start_datetime)} – {formatDate(item.end_datetime)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusColor[item.status?.toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No joined events yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Uploaded resources */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">Library</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Uploaded resources</h2>
              </div>
              <ArrowUpTrayIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {uploadedResources.length > 0 ? (
                uploadedResources.map((item) => (
                  <div key={item.resource_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">{item.title}</p>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusColor[item.status?.toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 truncate">
                      {item.subject || 'No subject'} · {item.course_code || 'No code'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.resource_type} · {item.download_count ?? 0} downloads
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No uploaded resources yet.
                </div>
              )}
            </div>
          </div>

          {/* Societies */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Communities</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Societies joined</h2>
              </div>
              <UsersIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {societyMemberships.length > 0 ? (
                societyMemberships.map((item) => (
                  <div key={item.membership_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">{item.name}</p>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Role: {item.role}</p>
                    <p className="mt-1 text-xs text-slate-500">Joined {formatDate(item.joined_at)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No society memberships yet.
                </div>
              )}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">Timeline</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Activity history</h2>
              </div>
              <ChartBarIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {activityHistory.length > 0 ? (
                activityHistory.slice(0, 8).map((item, index) => (
                  <div key={`${item.activity_type}-${index}`} className="flex gap-3">
                    <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600">{item.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
