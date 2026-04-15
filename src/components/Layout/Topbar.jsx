import React, { useState, useEffect } from 'react';

const Topbar = ({ currentView, onToggleSidebar }) => {
  const [theme, setTheme] = useState(localStorage.getItem('studypro_theme') || 'dark');

  const titles = {
    dashboard: 'Dashboard',
    banco: 'Banco de Questões',
    upload: 'Upload de PDF',
    gerador: 'Gerador com IA',
    simulado: 'Simulado',
    revisao: 'Revisão de Erros',
    flashcards: 'Flashcards',
    desempenho: 'Desempenho',
    cobertura: 'Cobertura',
    config: 'Configurações'
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('studypro_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleSidebar}>☰</button>
        <div className="topbar-title">{titles[currentView] || currentView}</div>
      </div>
      <div className="topbar-right">
        <div className="offline-pill" id="offline-pill">⚠ Offline</div>
        <button
          className="theme-btn"
          id="theme-btn"
          onClick={toggleTheme}
          title="Alternar tema"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
  );
};

export default Topbar;