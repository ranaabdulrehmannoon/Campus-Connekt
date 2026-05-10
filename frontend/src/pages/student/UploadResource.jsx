import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowRightIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  LinkIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const UploadResource = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('file')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    externalUrl: '',
  })
  const [resourceFile, setResourceFile] = useState(null)

  const fileName = useMemo(() => resourceFile?.name || 'No file selected', [resourceFile])
  const linkFilled = useMemo(() => Boolean(formData.externalUrl.trim()), [formData.externalUrl])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'file') {
      setFormData((current) => ({ ...current, externalUrl: '' }))
    } else {
      setResourceFile(null)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.title.trim() || !formData.description.trim() || !formData.subject.trim()) {
      toast.error('Title, description, and subject are required')
      return
    }

    if (mode === 'file' && !resourceFile) {
      toast.error('Please choose a file to upload')
      return
    }

    if (mode === 'link' && !formData.externalUrl.trim()) {
      toast.error('Please provide a valid link')
      return
    }

    if (mode === 'link' && resourceFile) {
      toast.error('Use either a file or a link, not both')
      return
    }

    setSubmitting(true)

    try {
      const payload = new FormData()
      payload.append('title', formData.title)
      payload.append('description', formData.description)
      payload.append('subject', formData.subject)

      if (mode === 'file' && resourceFile) {
        payload.append('resourceFile', resourceFile)
      }

      if (mode === 'link') {
        payload.append('externalUrl', formData.externalUrl)
      }

      const response = await axios.post('/api/resources', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success(response.data.message || 'Resource uploaded successfully')
      navigate('/resources')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload resource')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Upload resource</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Share a file or external link</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload stays pending until reviewed. Use either a file or a link, then provide the metadata needed for approval.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              Status: pending review
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              File or link only
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => switchMode('file')}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${mode === 'file' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              <span>
                <span className="block text-sm font-semibold">Upload file</span>
                <span className={`mt-1 block text-xs ${mode === 'file' ? 'text-slate-300' : 'text-slate-500'}`}>PDF, DOC, slides, or notes</span>
              </span>
              <ArrowUpTrayIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => switchMode('link')}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${mode === 'link' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              <span>
                <span className="block text-sm font-semibold">External link</span>
                <span className={`mt-1 block text-xs ${mode === 'link' ? 'text-slate-300' : 'text-slate-500'}`}>Drive, Notion, or public URL</span>
              </span>
              <LinkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Resource title"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
              <input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Computer Science"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="Summarize what this resource covers, who it helps, and any useful context."
              required
            />
          </div>

          {mode === 'file' ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">File upload</p>
                  <p className="mt-1 text-sm text-slate-600">Select a single file. The submission will remain pending until approved.</p>
                </div>
                <DocumentTextIcon className="h-6 w-6 text-slate-400" />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Choose file</label>
                <input
                  type="file"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null
                    setResourceFile(nextFile)
                    setFormData((current) => ({ ...current, externalUrl: '' }))
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-400"
                />
                <p className="mt-2 text-xs text-slate-500">Selected: {fileName}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">External URL</p>
                  <p className="mt-1 text-sm text-slate-600">Use a public or accessible resource link. File upload is disabled in this mode.</p>
                </div>
                <LinkIcon className="h-6 w-6 text-slate-400" />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Link</label>
                <input
                  name="externalUrl"
                  value={formData.externalUrl}
                  onChange={(event) => {
                    handleChange(event)
                    setResourceFile(null)
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  placeholder="https://example.com/resource"
                />
                <p className="mt-2 text-xs text-slate-500">{linkFilled ? 'Link entered' : 'Paste a valid URL to continue'}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Uploading...' : 'Submit resource'}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </form>

        <aside className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Approval status</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Submission lifecycle</h2>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Pending', text: 'Submitted and waiting for admin review.', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
              { title: 'Approved', text: 'Visible in the public resource list.', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { title: 'Rejected', text: 'Needs changes before it can be republished.', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border p-4 ${item.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.title === 'Approved' ? <ShieldCheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                </div>
                <p className="mt-1 text-sm">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Use either a file or a link, not both.</li>
              <li>Keep the title and subject specific.</li>
              <li>Approved resources will appear in the resources section.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default UploadResource