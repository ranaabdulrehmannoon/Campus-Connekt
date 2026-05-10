import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  ClockIcon,
  FunnelIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline'

const PendingApprovals = () => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [pendingSocieties, setPendingSocieties] = useState([])
  const [processingKey, setProcessingKey] = useState(null)

  const fetchPendingSummary = async () => {
    setLoading(true)
    try {
      const [summaryResponse, societyResponse] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/societies/pending'),
      ])
      setSummary(summaryResponse.data)
      setPendingSocieties(societyResponse.data.societies || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleModerationDecision = async (itemType, itemId, decision) => {
    const endpointMap = {
      event: `/api/events/${itemId}/${decision}`,
      resource: `/api/resources/${itemId}/${decision}`,
      society: `/api/societies/${itemId}/${decision}`,
    }

    const endpoint = endpointMap[itemType]
    if (!endpoint) {
      toast.error('Unsupported moderation item')
      return
    }

    const key = `${itemType}-${itemId}-${decision}`
    setProcessingKey(key)

    try {
      const response = await axios.patch(endpoint)
      const fallbackMessage = decision === 'approve' ? `${itemType} approved successfully` : `${itemType} rejected successfully`
      toast.success(response.data.message || fallbackMessage)
      await fetchPendingSummary()
    } catch (error) {
      const fallbackError = decision === 'approve' ? `Failed to approve ${itemType}` : `Failed to reject ${itemType}`
      toast.error(error.response?.data?.message || fallbackError)
    } finally {
      setProcessingKey(null)
    }
  }

  useEffect(() => {
    fetchPendingSummary()
  }, [])

  const pendingMetric = useMemo(() => {
    return summary?.metrics?.find((item) => item.label.toLowerCase().includes('pending'))?.value || 0
  }, [summary])

  const items = useMemo(() => {
    const allItems = summary?.recentItems || []
    if (typeFilter === 'all') return allItems
    return allItems.filter((item) => item.subtitle.toLowerCase().startsWith(typeFilter))
  }, [summary, typeFilter])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin moderation</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Pending Approvals</h1>
            <p className="mt-1 text-slate-600">Track open queue items and route them to review workflows.</p>
          </div>
          <button
            type="button"
            onClick={fetchPendingSummary}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Open queue</p>
            <ClockIcon className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-900">{pendingMetric}</p>
        </article>

        <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-800">Dedicated resource queue</p>
            <CheckBadgeIcon className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="mt-2 text-sm text-emerald-900">Use the specialized reviewer for approve/reject actions.</p>
          <Link to="/approve-resources" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">
            Open resource approvals
          </Link>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Filter</p>
            <FunnelIcon className="h-5 w-5 text-slate-500" />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="all">All pending types</option>
            <option value="resource">Resources only</option>
            <option value="event">Events only</option>
            <option value="society">Societies only</option>
          </select>
        </article>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <QueueListIcon className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Pending timeline</h2>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading queue...</p>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const itemType = item.item_type || item.subtitle.split(' · ')[0]
              const itemId = item.item_id || item.id.split('-').slice(1).join('-')
              const approveKey = `${itemType}-${itemId}-approve`
              const rejectKey = `${itemType}-${itemId}-reject`
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.subtitle}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {itemType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Submitted: {item.meta}</p>
                  {(itemType === 'event' || itemType === 'resource' || itemType === 'society') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerationDecision(itemType, itemId, 'approve')}
                        disabled={processingKey === approveKey || processingKey === rejectKey}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {processingKey === approveKey ? 'Approving...' : `Approve ${itemType}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerationDecision(itemType, itemId, 'reject')}
                        disabled={processingKey === approveKey || processingKey === rejectKey}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {processingKey === rejectKey ? 'Rejecting...' : `Reject ${itemType}`}
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No items match the selected filter.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Society approvals</h2>
        <p className="mt-1 text-sm text-slate-600">Approve newly created societies so students can join and engage.</p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading society requests...</p>
        ) : pendingSocieties.length > 0 ? (
          <div className="mt-4 space-y-3">
            {pendingSocieties.map((society) => (
              <div key={society.society_id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{society.name}</p>
                  <p className="text-sm text-slate-600">{society.description || 'No description provided.'}</p>
                  <p className="mt-1 text-xs text-slate-500">{society.category} · {society.created_by_name} ({society.created_by_email})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleModerationDecision('society', society.society_id, 'approve')}
                    disabled={processingKey === `society-${society.society_id}-approve` || processingKey === `society-${society.society_id}-reject`}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {processingKey === `society-${society.society_id}-approve` ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerationDecision('society', society.society_id, 'reject')}
                    disabled={processingKey === `society-${society.society_id}-approve` || processingKey === `society-${society.society_id}-reject`}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {processingKey === `society-${society.society_id}-reject` ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No pending society requests.
          </p>
        )}
      </div>
    </section>
  )
}

export default PendingApprovals
