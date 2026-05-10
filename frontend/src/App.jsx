import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider.jsx'
import { useAuth } from './context/useAuth'

// Layout
import Layout from './components/layout/Layout'

// Public Pages
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import VerifyEmailCode from './pages/auth/VerifyEmailCode'

// Student Pages
import Events from './pages/student/Events'
import Resources from './pages/student/Resources'
import ResourceDetails from './pages/student/ResourceDetails'
import ResourceRequests from './pages/student/ResourceRequests'
import UploadResource from './pages/student/UploadResource'
import Societies from './pages/student/Societies'
import SocietyDetails from './pages/student/SocietyDetails'
import Profile from './pages/student/Profile'
import Settings from './pages/student/Settings'
import Notifications from './pages/Notifications'

// Society Admin Pages
import CreateEvent from './pages/society-admin/CreateEvent'
import ManageEvents from './pages/society-admin/ManageEvents'
import CreateSociety from './pages/society-admin/CreateSociety'
import SocietyManagementDashboard from './pages/society-admin/SocietyManagementDashboard'

// Admin Pages
import ApproveResources from './pages/admin/ApproveResources'
import PendingApprovals from './pages/admin/PendingApprovals'
import UserManagement from './pages/admin/UserManagement'
import ManageSocieties from './pages/admin/ManageSocieties'

const ScrollToTop = () => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return null
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />
  }
  
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const dashboardPath = user?.role === 'admin' ? '/dashboard' : '/dashboard'
  
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={user ? <Navigate to={dashboardPath} replace /> : <Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify/:token" element={<VerifyEmail />} />
        <Route path="verify-email" element={<VerifyEmailCode />} />

        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="student/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="society/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="admin/dashboard" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="events" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Events />
          </ProtectedRoute>
        } />
        
        <Route path="resources" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Resources />
          </ProtectedRoute>
        } />

        <Route path="resource-requests" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <ResourceRequests />
          </ProtectedRoute>
        } />

        <Route path="upload-resource" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <UploadResource />
          </ProtectedRoute>
        } />

        <Route path="resource/:id" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <ResourceDetails />
          </ProtectedRoute>
        } />
        
        <Route path="societies" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Societies />
          </ProtectedRoute>
        } />

        <Route path="society/:id" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <SocietyDetails />
          </ProtectedRoute>
        } />

        <Route path="society/:id/dashboard" element={
          <ProtectedRoute allowedRoles={['society_admin', 'admin']}>
            <SocietyManagementDashboard />
          </ProtectedRoute>
        } />

        <Route path="profile" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="notifications" element={
          <ProtectedRoute allowedRoles={['student', 'society_admin', 'admin']}>
            <Notifications />
          </ProtectedRoute>
        } />
        
        {/* Society Admin Routes */}
        <Route path="create-event" element={
          <ProtectedRoute allowedRoles={['society_admin']}>
            <CreateEvent />
          </ProtectedRoute>
        } />

        <Route path="create-society" element={
          <ProtectedRoute allowedRoles={['society_admin', 'admin']}>
            <CreateSociety />
          </ProtectedRoute>
        } />

        <Route path="manage-events" element={
          <ProtectedRoute allowedRoles={['society_admin']}>
            <ManageEvents />
          </ProtectedRoute>
        } />

        <Route path="society/create-event" element={
          <ProtectedRoute allowedRoles={['society_admin']}>
            <CreateEvent />
          </ProtectedRoute>
        } />
        
        <Route path="society/manage-events" element={
          <ProtectedRoute allowedRoles={['society_admin']}>
            <ManageEvents />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="admin/pending-approvals" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PendingApprovals />
          </ProtectedRoute>
        } />

        <Route path="approve-resources" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ApproveResources />
          </ProtectedRoute>
        } />
        
        <Route path="admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />

        <Route path="admin/manage-societies" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageSocieties />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <ScrollToTop />
      <AppRoutes />
    </AuthProvider>
  )
}

export default App