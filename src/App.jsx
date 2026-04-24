import { useEffect } from 'react';
import Layout from './components/Layout/Layout';

function App() {
  // Carregar tema salvo na inicialização
  useEffect(() => {
    const savedTheme = localStorage.getItem('studypro_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Tema padrão se não houver salvo
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  return <Layout />;
}

export default App;
