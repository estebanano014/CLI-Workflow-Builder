import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@fontsource-variable/manrope'
import '@/styles/themes.css'
import '@/styles/global.css'
import App from '@/App'
import { ThemeProvider } from '@/context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
