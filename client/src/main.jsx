import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import FormPage from './pages/FormPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee'}}>
        <Link to="/form">新版开单</Link>
      </nav>
      <div style={{padding:16}}>
        <Routes>
          <Route path="/form" element={<FormPage/>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
createRoot(document.getElementById('root')).render(<App/>)