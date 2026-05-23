import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link} from 'react-router-dom'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<h1>About</h1>} />
        <Route path="/contact" element={<h1>Contact</h1>} />
      </Routes>
    </Router>
  )
}

export default App