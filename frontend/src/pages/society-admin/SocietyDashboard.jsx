import React from 'react'
import { Link } from 'react-router-dom'

const SocietyDashboard = () => {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Society Admin Dashboard</h1>
      <p className="text-slate-600">Manage your events from one place.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/create-event"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-slate-900">Create Event</h2>
          <p className="mt-2 text-sm text-slate-600">Add a new event with details, capacity, category, and thumbnail.</p>
          <p className="mt-4 text-sm font-semibold text-blue-600">Go to create event</p>
        </Link>

        <Link
          to="/manage-events"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-slate-900">Manage Events</h2>
          <p className="mt-2 text-sm text-slate-600">Edit, delete, close registration, and view participant lists.</p>
          <p className="mt-4 text-sm font-semibold text-blue-600">Go to manage events</p>
        </Link>
      </div>
    </section>
  )
}

export default SocietyDashboard
