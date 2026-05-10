import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import {
  ArrowLeftOnRectangleIcon,
  BookOpenIcon,
  CalendarIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  HomeIcon,
  QueueListIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
  BuildingLibraryIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import NotificationDropdown from './NotificationDropdown'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileDropdownRef = useRef(null)

  const isAuthenticated = Boolean(user)
  const isSocietyAdmin = user?.role === 'society_admin'
  const isAdmin = user?.role === 'admin'

  let navItems = []
  if (!isAuthenticated) {
    navItems = [
      { path: '/', label: 'Home', icon: HomeIcon },
      { path: '/events', label: 'Events', icon: CalendarIcon },
      { path: '/societies', label: 'Societies', icon: UsersIcon },
    ]
  } else if (isAdmin) {
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: ShieldCheckIcon },
      { path: '/admin/manage-societies', label: 'Manage Societies', icon: BuildingLibraryIcon },
      { path: '/admin/users', label: 'Manage Users', icon: UsersIcon },
      { path: '/admin/pending-approvals', label: 'Pending', icon: QueueListIcon },
      { path: '/approve-resources', label: 'Review Resources', icon: ShieldCheckIcon },
    ]
  } else if (isSocietyAdmin) {
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: ShieldCheckIcon },
      { path: '/events', label: 'Events', icon: CalendarIcon },
      { path: '/manage-events', label: 'Manage Events', icon: CalendarIcon },
      { path: '/create-event', label: 'Create Event', icon: CalendarIcon },
      { path: '/societies', label: 'Societies', icon: UsersIcon },
      { path: '/create-society', label: 'Create Society', icon: BuildingLibraryIcon },
      { path: '/resource-requests', label: 'Requests', icon: BookOpenIcon },
      { path: '/upload-resource', label: 'Upload Resource', icon: BookOpenIcon },
    ]
  } else {
    // student
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: ShieldCheckIcon },
      { path: '/events', label: 'Events', icon: CalendarIcon },
      { path: '/resources', label: 'Resources', icon: BookOpenIcon },
      { path: '/resource-requests', label: 'Requests', icon: BookOpenIcon },
      { path: '/upload-resource', label: 'Upload Resource', icon: BookOpenIcon },
      { path: '/societies', label: 'Societies', icon: UsersIcon },
    ]
  }

  const dashboardLink = useMemo(() => {
    if (!user) return '/login'
    return '/dashboard'
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setIsProfileOpen(false)
    logout()
    navigate('/login')
  }

  const userLabel = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User'
  const userInitial = (user?.fullName || user?.firstName || user?.username || 'U').charAt(0).toUpperCase()
  const roleLabel = user?.role?.replace('_', ' ') || 'Member'

  const linkClassName = ({ isActive }) =>
    `flex items-center space-x-1 transition-colors duration-200 ${
      isActive ? 'text-blue-700' : 'text-gray-700 hover:text-blue-600'
    }`

  const handleGuestFeatureClick = () => {
    toast.error('Login to join events or societies')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center group shrink-0">
            <img src="/img/Logo.png" alt="Campus ConneKt" className="h-14 w-auto -rotate-5 object-contain relative z-10" />
            <div className="flex flex-col justify-center h-full -ml-2">
              <span className="text-xl font-medium text-[#7a5a21] leading-3 group-hover:text-[#9c742a] transition-colors">
              ampus
            </span>
            <span className="text-xl font-medium text-[#7a5a21] leading-7 -mt-1 group-hover:text-[#9c742a] transition-colors">
              onneKt
            </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navItems.map((item) => (
              !isAuthenticated && (item.label === 'Events' || item.label === 'Societies') ? (
                <button
                  key={item.path}
                  type="button"
                  onClick={handleGuestFeatureClick}
                  className={linkClassName({ isActive: false })}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ) : (
                <NavLink key={item.path} to={item.path} className={linkClassName} end={item.path === '/'}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              )
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <NotificationDropdown />

                <div className="relative" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((current) => !current)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="hidden sm:block text-right">
                      <div className="text-sm font-semibold text-slate-900 leading-tight">{userLabel}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">{roleLabel}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-md shadow-blue-200">
                      {userInitial}
                    </div>
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                  </button>

                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl z-20">
                        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                          <div className="font-bold text-slate-900">{userLabel}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-500" />
                            {user?.username || user?.email || roleLabel}
                          </div>
                        </div>

                        <div className="px-2 py-2">
                          <NavLink
                            to={dashboardLink}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <ShieldCheckIcon className="mr-3 h-5 w-5 text-slate-400" />
                            Dashboard
                          </NavLink>
                          <NavLink
                            to="/profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <UserCircleIcon className="mr-3 h-5 w-5 text-slate-400" />
                            Profile
                          </NavLink>
                          <NavLink
                            to="/settings"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Cog6ToothIcon className="mr-3 h-5 w-5 text-slate-400" />
                            Settings
                          </NavLink>
                          <NavLink
                            to="/notifications"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <BellIcon className="mr-3 h-5 w-5 text-slate-400" />
                            Notifications
                          </NavLink>
                          {isSocietyAdmin && (
                            <>
                              <NavLink
                                to="/create-event"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                              >
                                <CalendarIcon className="mr-3 h-5 w-5 text-slate-400" />
                                Create Event
                              </NavLink>
                              <NavLink
                                to="/events"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                              >
                                <CalendarIcon className="mr-3 h-5 w-5 text-slate-400" />
                                Events
                              </NavLink>
                              <NavLink
                                to="/societies"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                              >
                                <UsersIcon className="mr-3 h-5 w-5 text-slate-400" />
                                Societies
                              </NavLink>
                              <NavLink
                                to="/resources"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                              >
                                <BookOpenIcon className="mr-3 h-5 w-5 text-slate-400" />
                                Resources
                              </NavLink>
                            </>
                          )}
                          {(user?.role === 'society_admin' || user?.role === 'admin') && (
                            <NavLink
                              to="/create-society"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                              <BuildingLibraryIcon className="mr-3 h-5 w-5 text-slate-400" />
                              Create Society
                            </NavLink>
                          )}
                          {user?.role === 'admin' && (
                            <NavLink
                              to="/admin/manage-societies"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                              <BuildingLibraryIcon className="mr-3 h-5 w-5 text-slate-400" />
                              Manage Societies
                            </NavLink>
                          )}
                          {user?.role === 'admin' && (
                            <NavLink
                              to="/admin/users"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center rounded-xl px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                              <UsersIcon className="mr-3 h-5 w-5 text-slate-400" />
                              Manage Users
                            </NavLink>
                          )}
                        </div>

                        <div className="border-t border-slate-100 px-2 py-2">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-red-400" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header