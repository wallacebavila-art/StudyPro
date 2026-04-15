import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StudyProvider } from './context/StudyContext'
import './styles/global.css'
import './styles/utils.css'
import './index.css'
import App from './App.jsx'

// Inicializar tema
const savedTheme = localStorage.getItem('studypro_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Inicializar fonte
const savedFont = localStorage.getItem('studypro_font') || 'Nunito';
const fontFamilies = {
  'Nunito': "'Nunito', sans-serif",
  'Inter': "'Inter', sans-serif",
  'Roboto': "'Roboto', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  'Poppins': "'Poppins', sans-serif",
  'Montserrat': "'Montserrat', sans-serif",
  'Lato': "'Lato', sans-serif",
  'Source Sans Pro': "'Source Sans 3', sans-serif",
  'Raleway': "'Raleway', sans-serif",
  'Work Sans': "'Work Sans', sans-serif"
};
document.documentElement.style.setProperty('--app-font', fontFamilies[savedFont] || fontFamilies['Nunito']);
document.body.style.fontFamily = fontFamilies[savedFont] || fontFamilies['Nunito'];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StudyProvider>
      <App />
    </StudyProvider>
  </StrictMode>,
)
