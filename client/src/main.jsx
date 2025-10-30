import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FormPage from './pages/FormPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage/>} />
        <Route path="/form" element={<FormPage/>} />
      </Routes>
    </BrowserRouter>
  )
}
createRoot(document.getElementById('root')).render(<App/>)