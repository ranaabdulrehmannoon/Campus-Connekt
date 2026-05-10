import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const CreateSociety = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'technical',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleLogoChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Society name is required')
      return
    }

    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      data.append('category', formData.category)
      if (logoFile) {
        data.append('logo', logoFile)
      }

      const response = await axios.post('/api/societies', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      toast.success(response.data.message || 'Society created successfully')
      navigate(`/society/${response.data.societyId}/dashboard`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create society')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Create Society</h1>
        <p className="mt-3 text-slate-600">Submit your society profile for admin approval.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Society name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            placeholder="NUST AI Society"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 resize-none"
            placeholder="What your society does and who should join"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 text-slate-700"
            >
              <option value="technical">Technical</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Sports</option>
              <option value="literary">Literary</option>
              <option value="social">Social</option>
              <option value="religious">Religious</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Society Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Submitting...' : 'Create society'}
        </button>
      </form>
    </section>
  )
}

export default CreateSociety