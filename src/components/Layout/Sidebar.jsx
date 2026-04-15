import React, { useState } from 'react';
import { useStudy } from '../../context/StudyContext';

const Sidebar = () => {
  const { questions, simulados, currentView, setView, isOnline } = useStudy();
  const [isOpen, setIsOpen] = useState(false);

  const totalQuestions = Object.keys(questions).length;
  const totalSimulados = Object.keys(simulados).length;
  const errorsCount = Object.values(questions).filter(q =>
    Object.values(simulados).some(s => s.respostas && s.respostas[q.id] !== q.gabarito)
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'banco', label: 'Banco de Questões', icon: '🗄️', badge: totalQuestions },
    { id: 'upload', label: 'Upload PDF', icon: '📤' },
    { id: 'gerador', label: 'Gerador IA', icon: '🤖' },
    { section: 'Estudar' },
    { id: 'simulado', label: 'Simulado', icon: '📝' },
    { id: 'revisao', label: 'Revisão de Erros', icon: '🔁', badge: errorsCount, badgeClass: 'nav-badge' },
    { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
    { section: 'Análise' },
    { id: 'desempenho', label: 'Desempenho', icon: '📈' },
    { id: 'cobertura', label: 'Cobertura', icon: '🗺️' },
    { section: 'Sistema' },
    { id: 'config', label: 'Configurações', icon: '⚙️' }
  ];

  const handleNavClick = (id) => {
    setView(id);
    setIsOpen(false);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="logo">
          <div className="logo-mark">Study<span>PRO</span></div>
          <div className="logo-sub">Sistema de Estudos</div>
          <div className="fb-badge">🔥 Firebase</div>
        </div>
        <div className="nav">
          {navItems.map((item, index) => (
            item.section ? (
              <div key={index} className="nav-sec">{item.section}</div>
            ) : (
              <div
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="ico">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={item.badgeClass || 'nav-badge'}>{item.badge}</span>
                )}
              </div>
            )
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="ss-grid">
            <div className="ss-card">
              <div className="ss-num" id="ss-q">{totalQuestions}</div>
              <div className="ss-lbl">Questões</div>
            </div>
            <div className="ss-card">
              <div className="ss-num" id="ss-s">{totalSimulados}</div>
              <div className="ss-lbl">Simulados</div>
            </div>
          </div>
          <div className="sync-row">
            <div className={`sync-dot ${isOnline ? 'ok' : 'offline'}`}></div>
            <span id="sync-txt">{isOnline ? 'Sincronizado' : 'Offline'}</span>
          </div>
        </div>
      </div>
      <div
        className={`sidebar-overlay ${isOpen ? 'on' : ''}`}
        onClick={() => setIsOpen(false)}
      ></div>
    </>
  );
};

export default Sidebar;