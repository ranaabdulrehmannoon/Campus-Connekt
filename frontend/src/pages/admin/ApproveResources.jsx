import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ApproveResources = () => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const loadPendingResources = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/resources/pending')
      setResources(response.data.resources || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingResources()
  }, [])

  const handleDecision = async (resourceId, decision) => {
    setProcessingId(resourceId)
    try {
      await axios.patch(`/api/resources/${resourceId}/${decision}`)
      toast.success(decision === 'approve' ? 'Resource approved' : 'Resource rejected')
      await loadPendingResources()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update resource')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Approve Resources</h1>
        <p className="mt-1 text-slate-600">Review new uploads before they are visible to students.</p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Loading pending resources...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm lg:col-span-2">No pending resources right now.</div>
          ) : (
            resources.map((resource) => (
              <article key={resource.resource_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{resource.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{resource.description || 'No description provided.'}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-800">Subject:</span> {resource.subject || 'Not set'}</p>
                  <p><span className="font-semibold text-slate-800">Uploaded by:</span> {resource.uploaded_by_name || 'Unknown'}</p>
                  <p><span className="font-semibold text-slate-800">Type:</span> {resource.resource_type}</p>
                  <p><span className="font-semibold text-slate-800">Submitted:</span> {resource.created_at}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={resource.file_url || resource.external_url || '#'} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Preview source
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDecision(resource.resource_id, 'approve')}
                    disabled={processingId === resource.resource_id}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(resource.resource_id, 'reject')}
                    disabled={processingId === resource.resource_id}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default ApproveResources