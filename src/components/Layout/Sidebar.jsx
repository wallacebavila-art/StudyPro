import { useState } from 'react';
import { useStudy } from '../../context/StudyContext';

const Sidebar = () => {
  const { questions, simulados, currentView, setView, isOnline, isLoading } = useStudy();
  const [isOpen, setIsOpen] = useState(false);

  // Proteção contra undefined durante loading
  const safeQuestions = questions || {};
  const safeSimulados = simulados || {};

  const totalQuestions = Object.keys(safeQuestions).length;
  const totalSimulados = Object.keys(safeSimulados).length;
  const errorsCount = Object.values(safeQuestions).filter(q =>
    Object.values(safeSimulados).some(s => s.respostas && s.respostas[q.id] !== q.gabarito)
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', iconColor: '#4ade80' },
    { id: 'banco', label: 'Banco de Questões', icon: '📚', badge: totalQuestions, iconColor: '#60a5fa' },
    { id: 'upload', label: 'Upload PDF', icon: '📤', iconColor: '#fbbf24' },
    { id: 'gerador', label: 'Gerador IA', icon: '✨', iconColor: '#a78bfa' },
    { id: 'leis-pdf', label: 'Questões Leis PDF', icon: '📜', iconColor: '#f472b6' },
    { section: 'Estudar' },
    { id: 'simulado', label: 'Simulado', icon: '🎯', iconColor: '#f87171' },
    { id: 'revisao', label: 'Revisão de Erros', icon: '🔄', badge: errorsCount, badgeClass: 'nav-badge', iconColor: '#fb923c' },
    { id: 'flashcards', label: 'Flashcards', icon: '🎴', iconColor: '#2dd4bf' },
    { section: 'Análise' },
    { id: 'desempenho', label: 'Desempenho', icon: '📈', iconColor: '#34d399' },
    { id: 'cobertura', label: 'Cobertura', icon: '🗺️', iconColor: '#818cf8' },
    { section: 'Sistema' },
    { id: 'config', label: 'Configurações', icon: '⚙️', iconColor: '#94a3b8' }
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
                <span 
                  className="ico"
                  style={{ color: item.iconColor || 'inherit' }}
                >
                  {item.icon}
                </span>
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