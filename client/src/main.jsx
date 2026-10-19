import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { preloadInitialView } from './route-views'
import { parseCurrentLocation } from './utils/routing'

async function mount() {
  // Keep the prerendered page visible until its own code is ready. Mounting a
  // lazy fallback first would erase the page and cause a second layout shift.
  const initialViews = await preloadInitialView(parseCurrentLocation().view)
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App initialViews={initialViews} />
    </StrictMode>,
  )
}
void mount()
