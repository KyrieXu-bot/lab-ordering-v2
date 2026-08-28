import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getSession } from './auth.js'
import LoginPage from './pages/LoginPage.jsx'
import SalesDashboard from './pages/SalesDashboard.jsx'
import ReviewerDashboard from './pages/ReviewerDashboard.jsx'
import NewRequestPage from './pages/NewRequestPage.jsx'
import ReviewRequestPage from './pages/ReviewRequestPage.jsx'
import RequestDetail from './pages/RequestDetail.jsx'
import EditRequestPage from './pages/EditRequestPage.jsx'
import ReviewerCreateOrderPage from './pages/ReviewerCreateOrderPage.jsx'
import ChangeRequestPage from './pages/ChangeRequestPage.jsx'
import AdditionalTestRequestPage from './pages/AdditionalTestRequestPage.jsx'

function Protected({ children, reviewer }) {
  const session = getSession()
  if (!session?.token) return <Navigate to="/login" replace />
  if (reviewer === true && !session.user?.reviewer) return <Navigate to="/" replace />
  if (reviewer === false && session.user?.reviewer) return <Navigate to="/" replace />
  return children
}

function Home() {
  const session = getSession()
  if (!session?.token) return <Navigate to="/login" replace />
  return session.user?.reviewer ? <ReviewerDashboard /> : <SalesDashboard />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Home />} />
      <Route path="/requests/new" element={<Protected reviewer={false}><NewRequestPage /></Protected>} />
      <Route path="/requests/:id/edit" element={<Protected reviewer={false}><EditRequestPage /></Protected>} />
      <Route path="/requests/:id/change" element={<Protected reviewer={false}><ChangeRequestPage /></Protected>} />
      <Route path="/requests/:id/add-test" element={<Protected reviewer={false}><AdditionalTestRequestPage /></Protected>} />
      <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
      <Route path="/review/:id" element={<Protected reviewer><ReviewRequestPage /></Protected>} />
      <Route path="/orders/new" element={<Protected reviewer><ReviewerCreateOrderPage /></Protected>} />
      {import.meta.env.DEV && <Route path="/__preview/request" element={<NewRequestPage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>)
