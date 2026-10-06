import '@fontsource-variable/figtree'
import '@fontsource-variable/fraunces'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NotificationsProvider } from './ui'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  </StrictMode>,
)
