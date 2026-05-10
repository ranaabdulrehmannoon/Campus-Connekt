import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowRightIcon,
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/useAuth'

const Societies = () => {
  const { user } = useAuth()
  const [societies, setSocieties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', category: 'all', onlyJoined: false })
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const loadSocieties = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (filters.search.trim()) query.append('search', filters.search.trim())
        if (filters.category !== 'all') query.append('category', filters.category)

        const response = await axios.get(`/api/societies?${query.toString()}`)
        setSocieties(response.data.societies || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load societies')
      } finally {
        setLoading(false)
      }
    }

    loadSocieties()
  }, [filters.search, filters.category])

  const handleViewDetails = (society) => {
    if (society.is_joined) {
      // Navigate to detail page if member
      window.location.href = `/society/${society.society_id}`
    } else {
      // Show preview modal if not member
      setSelectedSociety(society)
    }
  }

  const handleJoinSociety = async () => {
    if (!selectedSociety) return
    
    setJoining(true)
    try {
      const response = await axios.post(`/api/societies/${selectedSociety.society_id}/join`)
      toast.success(response.data.message || 'Joined society successfully')
      setSelectedSociety(null)
      // Refresh societies list
      const response2 = await axios.get('/api/societies')
      setSocieties(response2.data.societies || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join society')
    } finally {
      setJoining(false)
    }
  }

  const categories = useMemo(() => {
    const set = new Set(['all'])
    societies.forEach((society) => set.add(society.category))
    return Array.from(set)
  }, [societies])

  const filteredSocieties = useMemo(() => {
    if (!filters.onlyJoined) return societies
    return societies.filter((society) => society.is_joined)
  }, [societies, filters.onlyJoined])

  const totalMembers = useMemo(
    () => societies.reduce((sum, society) => sum + Number(society.member_count || 0), 0),
    [societies]
  )

  const getApprovalBadge = (isApproved) => {
    if (Number(isApproved) === 1) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }
    if (Number(isApproved) === 0) {
      return 'border-amber-200 bg-amber-50 text-amber-700'
    }
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  const getApprovalLabel = (isApproved) => {
    if (Number(isApproved) === 1) return 'Approved'
    if (Number(isApproved) === 0) return 'Pending approval'
    return 'Rejected'
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Societies</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Approved societies</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Search, filter, and open any society for events, announcements, and membership actions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              {societies.length} listed
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              {totalMembers} members
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search societies by name, description, or category"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-11 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </label>

          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All categories' : category}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFilters((current) => ({ ...current, onlyJoined: !current.onlyJoined }))}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filters.onlyJoined
                ? 'border border-blue-200 bg-blue-50 text-blue-700'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {filters.onlyJoined ? '✓ Joined societies' : 'Joined societies'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Loading societies...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSocieties.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm xl:col-span-3">
              {filters.onlyJoined ? 'You have not joined any societies yet.' : 'No societies found.'}
            </div>
          ) : (
            filteredSocieties.map((society, index) => (
              <article key={society.society_id} className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
                  <div className="absolute right-6 top-4 h-24 w-24 overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg transition-transform group-hover:scale-105 group-hover:border-white/40">
                    {society.logo_url ? (
                      <img
                        src={society.logo_url.startsWith('http') ? society.logo_url : society.logo_url}
                        alt={`${society.name} logo`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(society.name) + '&background=0D8ABC&color=fff';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold uppercase tracking-[0.2em] text-white/60">
                        #{index + 1}
                      </div>
                    )}
                  </div>
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-400/20 blur-3xl" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <h2 className="text-2xl font-bold leading-tight">{society.name}</h2>
                    <p className="mt-1 text-sm text-slate-300">{society.category || 'other'}</p>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="line-clamp-2 text-sm leading-5 text-slate-600">{society.description || 'No description provided.'}</p>

                  <div className="flex flex-col gap-2.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                      <span className="truncate text-slate-700">{society.member_count || 0} active members</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BuildingLibraryIcon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                      <span className="truncate text-slate-700">Created by {society.created_by_name || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                      {society.category || 'other'}
                    </span>
                    {Number(society.is_approved) !== 1 ? (
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getApprovalBadge(society.is_approved)}`}>
                        {getApprovalLabel(society.is_approved)}
                      </span>
                    ) : null}
                    {society.is_joined ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Joined
                      </span>
                    ) : null}
                    {society.member_role ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 capitalize">
                        {society.member_role}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleViewDetails(society)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View details
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Society Preview Modal */}
      {selectedSociety && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSociety(null)}
              className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-md transition hover:bg-slate-50 z-10"
            >
              <XMarkIcon className="h-5 w-5 text-slate-600" />
            </button>

            {/* Header with Logo */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
              <div className="absolute inset-0 opacity-50">
                <div className="absolute left-6 top-8 h-24 w-24 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="absolute right-6 top-6 h-32 w-32 rounded-full bg-indigo-400/20 blur-3xl" />
              </div>

              <div className="relative flex items-end gap-4 p-6">
                {selectedSociety.logo_url && (
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-lg">
                    <img
                      src={selectedSociety.logo_url.startsWith('http') ? selectedSociety.logo_url : selectedSociety.logo_url}
                      alt={`${selectedSociety.name} logo`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedSociety.name) + '&background=0D8ABC&color=fff'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 text-white">
                  <h2 className="text-3xl font-bold">{selectedSociety.name}</h2>
                  <p className="mt-1 text-slate-300">{selectedSociety.category || 'other'}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {/* Description */}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">About</p>
                <p className="mt-2 text-slate-700">{selectedSociety.description || 'No description provided.'}</p>
              </div>

              {/* Info Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Members</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedSociety.member_count || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Created by</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedSociety.created_by_name || 'Unknown'}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                  {selectedSociety.category || 'other'}
                </span>
              </div>

              {/* Join Button */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={handleJoinSociety}
                  disabled={joining}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {joining ? 'Joining...' : 'Join Society'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Societies
