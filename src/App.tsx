import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import Dashboard from '@/pages/Dashboard'
import Files from '@/pages/Files'
import Settings from '@/pages/Settings'
import MobileApp from '@/pages/MobileApp'
import DesktopApp from '@/pages/DesktopApp'
import Support from '@/pages/Support'
import Pricing from '@/pages/Pricing'
import NotFound from '@/pages/NotFound'
import PublicShare from '@/pages/PublicShare'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUserDetail from '@/pages/admin/AdminUserDetail'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Home from "./pages/Home";
import ServiceAgreement from '@/pages/ServiceAgreement'
import CompanyProfile from '@/pages/CompanyProfile'
import ClientRequirementForm from '@/pages/ClientRequirementForm'
import AdminClientFormDetail from '@/pages/admin/AdminClientFormDetail'

export default function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<Navigate to="/dashboard" replace />} /> */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/share/:token" element={<PublicShare />} />
      <Route path="/service-agreement" element={<ServiceAgreement />} />
      <Route path="/company-profile" element={<CompanyProfile />} />
      <Route path="/client-requirement-form" element={<ClientRequirementForm />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/files" element={<Files />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/cctv" element={<Settings only="cctv" />} />
        <Route path="/mobile-app" element={<MobileApp />} />
        <Route path="/desktop-app" element={<DesktopApp />} />
        <Route path="/support" element={<Support />} />
        {/* adminOnly is a UX redirect only — the backend's requireAdmin
            middleware is the actual authorization boundary. A non-admin
            hitting these routes never reaches a point where admin data
            could leak; they're just bounced back to /dashboard before any
            admin API call is made. */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-forms/:formId"
          element={
            <ProtectedRoute adminOnly>
              <AdminClientFormDetail />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
