import React from 'react'
import ReactDOM from 'react-dom/client'
import GpaCalculator from './GpaCalculator.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-screen bg-background text-foreground font-sans">
      <GpaCalculator />
    </div>
  </React.StrictMode>,
)
