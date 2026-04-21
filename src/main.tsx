import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import SharedRecipePage from './components/SharedRecipePage.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import './index.css'

// Detect ?share=<shareId> — render the public shared recipe view instead of the full app.
const shareId = new URLSearchParams(window.location.search).get('share');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        {shareId ? <SharedRecipePage shareId={shareId} /> : <App />}
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
)
