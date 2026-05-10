import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const MEMBER_ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'president', label: 'President' },
  { value: 'vice_president', label: 'Vice President' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
]

const SOCIETY_CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'literary', label: 'Literary' },
  { value: 'social', label: 'Social' },
  { value: 'religious', label: 'Religious' },
  { value: 'other', label: 'Other' },
]

const SocietyManagementDashboard = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [permissionError, setPermissionError] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', isPinned: false })
  const [societyForm, setSocietyForm] = useState({ name: '', description: '', category: 'technical', logo: '' })
  const [updatingSociety, setUpdatingSociety] = useState(false)
  const [submittingMember, setSubmittingMember] = useState(false)
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)
  const [editingAnnouncementForm, setEditingAnnouncementForm] = useState({ title: '', content: '', isPinned: false })

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setPermissionError(null)
    try {
      const response = await axios.get(`/api/societies/${id}/dashboard`)
      setDashboard(response.data)
      if (response.data?.society) {
        setSocietyForm({
          name: response.data.society.name || '',
          description: response.data.society.description || '',
          category: response.data.society.category || 'technical',
          logo: response.data.society.logo || '',
        })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load society dashboard'
      // Check if it's a 403 permission error
      if (error.response?.status === 403) {
        setPermissionError(errorMessage)
        toast.error(errorMessage)
        // Redirect to societies list after showing error
        setTimeout(() => navigate('/societies'), 2000)
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const stats = useMemo(() => dashboard?.stats || {}, [dashboard])

  const handleAddMember = async (event) => {
    event.preventDefault()
    if (!memberEmail.trim()) return

    setSubmittingMember(true)
    try {
      const response = await axios.post(`/api/societies/${id}/members`, { email: memberEmail, role: memberRole })
      toast.success(response.data.message || 'Member added')
      setMemberEmail('')
      setMemberRole('member')
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member')
    } finally {
      setSubmittingMember(false)
    }
  }

  const handleRemoveMember = async (memberUserId) => {
    try {
      const response = await axios.delete(`/api/societies/${id}/members/${memberUserId}`)
      toast.success(response.data.message || 'Member removed')
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member')
    }
  }

  const handleUpdateMemberRole = async (memberUserId, role) => {
    try {
      const response = await axios.patch(`/api/societies/${id}/members/${memberUserId}/role`, { role })
      toast.success(response.data.message || 'Member role updated')
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member role')
    }
  }

  const handleSocietyFormChange = (event) => {
    const { name, value } = event.target
    setSocietyForm((current) => ({ ...current, [name]: value }))
  }

  const handleUpdateSociety = async (event) => {
    event.preventDefault()

    if (!societyForm.name.trim()) {
      toast.error('Society name is required')
      return
    }

    setUpdatingSociety(true)
    try {
      const response = await axios.patch(`/api/societies/${id}`, {
        name: societyForm.name,
        description: societyForm.description,
        category: societyForm.category,
        logo: societyForm.logo,
      })
      toast.success(response.data.message || 'Society details updated')
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update society')
    } finally {
      setUpdatingSociety(false)
    }
  }

  const handlePostAnnouncement = async (event) => {
    event.preventDefault()
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    setSubmittingAnnouncement(true)
    try {
      const response = await axios.post(`/api/societies/${id}/announcements`, announcementForm)
      toast.success(response.data.message || 'Announcement posted')
      setAnnouncementForm({ title: '', content: '', isPinned: false })
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post announcement')
    } finally {
      setSubmittingAnnouncement(false)
    }
  }

  const startEditingAnnouncement = (announcement) => {
    setEditingAnnouncementId(announcement.announcement_id)
    setEditingAnnouncementForm({
      title: announcement.title || '',
      content: announcement.content || '',
      isPinned: Boolean(announcement.is_pinned),
    })
  }

  const cancelEditingAnnouncement = () => {
    setEditingAnnouncementId(null)
    setEditingAnnouncementForm({ title: '', content: '', isPinned: false })
  }

  const handleUpdateAnnouncement = async (announcementId) => {
    if (!editingAnnouncementForm.title.trim() || !editingAnnouncementForm.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      const response = await axios.patch(`/api/societies/${id}/announcements/${announcementId}`, editingAnnouncementForm)
      toast.success(response.data.message || 'Announcement updated')
      cancelEditingAnnouncement()
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update announcement')
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    const confirmed = window.confirm('Delete this announcement permanently?')
    if (!confirmed) return

    try {
      const response = await axios.delete(`/api/societies/${id}/announcements/${announcementId}`)
      toast.success(response.data.message || 'Announcement deleted')
      if (editingAnnouncementId === announcementId) {
        cancelEditingAnnouncement()
      }
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete announcement')
    }
  }

  const handleToggleAnnouncementPin = async (announcement) => {
    try {
      const response = await axios.patch(`/api/societies/${id}/announcements/${announcement.announcement_id}`, {
        title: announcement.title,
        content: announcement.content,
        isPinned: !announcement.is_pinned,
      })
      toast.success(response.data.message || 'Announcement updated')
      await fetchDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update announcement')
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading society dashboard...</div>
  }

  if (permissionError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="font-semibold text-rose-900">Access Denied</p>
        <p className="mt-2 text-sm text-rose-700">{permissionError}</p>
        <p className="mt-2 text-xs text-rose-600">Redirecting to societies...</p>
      </div>
    )
  }

  if (!dashboard?.society) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-600">Society dashboard not available.</div>
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{dashboard.society.name} Dashboard</h1>
          <p className="mt-1 text-slate-600">Manage members, announcements, and society events.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] ${
              Number(dashboard.society.is_approved) === 1
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : Number(dashboard.society.is_approved) === 0
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
              {Number(dashboard.society.is_approved) === 1
                ? 'Approved'
                : Number(dashboard.society.is_approved) === 0
                  ? 'Pending approval'
                  : 'Rejected'}
            </span>
            {Number(dashboard.society.is_approved) !== 1 ? (
              <span className="text-sm text-slate-600">
                {Number(dashboard.society.is_approved) === 0
                  ? 'Your society is waiting for admin review.'
                  : 'Your society was rejected by an admin.'}
              </span>
            ) : null}
          </div>
        </div>
        <Link to={`/create-event?societyId=${dashboard.society.society_id}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
          Create event
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Members</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_members || 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Announcements</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_announcements || 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Events</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_events || 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Open events</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.open_events || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Member management</h2>
            <form onSubmit={handleAddMember} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="student@nust.edu.pk"
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
              <select
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
              >
                {MEMBER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={submittingMember}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingMember ? 'Adding...' : 'Add member'}
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {(dashboard.members || []).map((member) => (
                <div key={member.membership_id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{member.first_name} {member.last_name}</p>
                    <p className="text-sm text-slate-600">{member.email} · {member.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(event) => handleUpdateMemberRole(member.user_id, event.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {MEMBER_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {member.role !== 'president' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleUpdateSociety} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Society details</h2>
            <p className="mt-1 text-sm text-slate-600">Edit your society profile and keep member-facing information up to date.</p>
            <div className="mt-4 space-y-3">
              <input
                name="name"
                value={societyForm.name}
                onChange={handleSocietyFormChange}
                placeholder="Society name"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
              <textarea
                name="description"
                value={societyForm.description}
                onChange={handleSocietyFormChange}
                rows="4"
                placeholder="Describe your society"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="category"
                  value={societyForm.category}
                  onChange={handleSocietyFormChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
                >
                  {SOCIETY_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  name="logo"
                  value={societyForm.logo}
                  onChange={handleSocietyFormChange}
                  placeholder="Logo URL"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={updatingSociety}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {updatingSociety ? 'Saving...' : 'Save society details'}
              </button>
            </div>
          </form>

          <form onSubmit={handlePostAnnouncement} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Post announcement</h2>
            <div className="mt-4 space-y-3">
              <input
                value={announcementForm.title}
                onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Announcement title"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
              <textarea
                value={announcementForm.content}
                onChange={(event) => setAnnouncementForm((current) => ({ ...current, content: event.target.value }))}
                rows="5"
                placeholder="Write your update for members"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={announcementForm.isPinned}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, isPinned: event.target.checked }))}
                />
                Pin this announcement
              </label>
              <button
                type="submit"
                disabled={submittingAnnouncement}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingAnnouncement ? 'Posting...' : 'Post announcement'}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Recent announcements</h2>
            <div className="mt-4 space-y-3">
              {(dashboard.announcements || []).length > 0 ? dashboard.announcements.map((announcement) => (
                <div key={announcement.announcement_id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{announcement.title}</p>
                    {announcement.is_pinned ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">Pinned</span> : null}
                  </div>
                  {editingAnnouncementId === announcement.announcement_id ? (
                    <div className="mt-3 space-y-3">
                      <input
                        value={editingAnnouncementForm.title}
                        onChange={(event) => setEditingAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        placeholder="Announcement title"
                      />
                      <textarea
                        value={editingAnnouncementForm.content}
                        onChange={(event) => setEditingAnnouncementForm((current) => ({ ...current, content: event.target.value }))}
                        rows="4"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        placeholder="Announcement content"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={editingAnnouncementForm.isPinned}
                          onChange={(event) => setEditingAnnouncementForm((current) => ({ ...current, isPinned: event.target.checked }))}
                        />
                        Pin this announcement
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateAnnouncement(announcement.announcement_id)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingAnnouncement}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-slate-600">{announcement.content}</p>
                      <p className="mt-1 text-xs text-slate-500">{announcement.created_at}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingAnnouncement(announcement)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAnnouncementPin(announcement)}
                          className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {announcement.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(announcement.announcement_id)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )) : <p className="text-sm text-slate-500">No announcements yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SocietyManagementDashboard