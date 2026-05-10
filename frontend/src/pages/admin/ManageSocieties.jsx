import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowPathIcon,
  BuildingLibraryIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const CATEGORY_OPTIONS = ['technical', 'cultural', 'sports', 'literary', 'social', 'religious', 'other']

const getStatusBadge = (isApproved) => {
  if (Number(isApproved) === 1) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (Number(isApproved) === 0) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

const getStatusLabel = (isApproved) => {
  if (Number(isApproved) === 1) return 'approved'
  if (Number(isApproved) === 0) return 'pending'
  return 'rejected'
}

const emptyForm = {
  name: '',
  description: '',
  category: 'technical',
  logo: '',
}

const ManageSocieties = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [societies, setSocieties] = useState([])
  const [editingSocietyId, setEditingSocietyId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const fetchSocieties = async (showToast = false) => {
    setLoading(true)
    try {
      const response = await axios.get('/api/societies/admin/all')
      setSocieties(response.data.societies || [])
      if (showToast) toast.success('Society list refreshed')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load societies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSocieties()
  }, [])

  const stats = useMemo(() => {
    return societies.reduce(
      (acc, society) => {
        const status = Number(society.is_approved)
        if (status === 1) acc.approved += 1
        else if (status === 0) acc.pending += 1
        else acc.rejected += 1
        acc.members += Number(society.member_count || 0)
        return acc
      },
      { approved: 0, pending: 0, rejected: 0, members: 0 }
    )
  }, [societies])

  const filteredSocieties = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return societies

    return societies.filter((society) => {
      return (
        String(society.name || '').toLowerCase().includes(term)
        || String(society.category || '').toLowerCase().includes(term)
        || String(society.created_by_name || '').toLowerCase().includes(term)
      )
    })
  }, [search, societies])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingSocietyId(null)
  }

  const handleEdit = (society) => {
    setEditingSocietyId(society.society_id)
    setFormData({
      name: society.name || '',
      description: society.description || '',
      category: society.category || 'other',
      logo: society.logo_url || society.logo || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Society name is required')
      return
    }

    setSaving(true)
    try {
      if (editingSocietyId) {
        const response = await axios.patch(`/api/societies/${editingSocietyId}`, formData)
        toast.success(response.data.message || 'Society updated successfully')
      } else {
        const response = await axios.post('/api/societies', formData)
        toast.success(response.data.message || 'Society created successfully')
      }

      resetForm()
      await fetchSocieties()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save society')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (societyId, societyName) => {
    const shouldDelete = window.confirm(`Delete "${societyName}" permanently? This action cannot be undone.`)
    if (!shouldDelete) return

    setDeletingId(societyId)
    try {
      const response = await axios.delete(`/api/societies/${societyId}`)
      toast.success(response.data.message || 'Society deleted successfully')
      if (editingSocietyId === societyId) {
        resetForm()
      }
      await fetchSocieties()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete society')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_38%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Manage Societies</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Perform full CRUD operations for societies. Edit, delete and update societies as needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchSocieties(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.approved}</p>
        </article>
        <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{stats.pending}</p>
        </article>
        <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Rejected</p>
          <p className="mt-2 text-3xl font-bold text-rose-900">{stats.rejected}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Members</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.members}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingSocietyId ? 'Update society' : 'Create society'}
            </h2>
            {editingSocietyId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Society name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                placeholder="NUST Tech Club"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                placeholder="Share your mission, activities, and who should join"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Logo URL (optional)</label>
                <input
                  name="logo"
                  value={formData.logo}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {editingSocietyId ? <PencilSquareIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
              {saving ? 'Saving...' : editingSocietyId ? 'Update society' : 'Create society'}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">All societies</h2>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, category, creator"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading societies...</div>
          ) : filteredSocieties.length > 0 ? (
            <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {filteredSocieties.map((society) => {
                const statusLabel = getStatusLabel(society.is_approved)
                return (
                  <article key={society.society_id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <BuildingLibraryIcon className="h-5 w-5 shrink-0 text-slate-500" />
                          <h3 className="truncate text-base font-semibold text-slate-900">{society.name}</h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{society.description || 'No description provided.'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadge(society.is_approved)}`}>
                            {statusLabel}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            {society.category || 'other'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <UserGroupIcon className="h-3.5 w-3.5" />
                            {society.member_count || 0}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Created by {society.created_by_name || 'Unknown'} · #{society.society_id}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(society)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(society.society_id, society.name)}
                          disabled={deletingId === society.society_id}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {deletingId === society.society_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No societies match your search.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ManageSocieties
