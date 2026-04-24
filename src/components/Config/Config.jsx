import { useState, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';

const FONTS = [
  { name: 'Nunito', label: 'Nunito (Padrão)', family: "'Nunito', sans-serif" },
  { name: 'Inter', label: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { name: 'Open Sans', label: 'Open Sans', family: "'Open Sans', sans-serif" },
  { name: 'Poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { name: 'Montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Lato', label: 'Lato', family: "'Lato', sans-serif" },
  { name: 'Source Sans Pro', label: 'Source Sans Pro', family: "'Source Sans 3', sans-serif" },
  { name: 'Raleway', label: 'Raleway', family: "'Raleway', sans-serif" },
  { name: 'Work Sans', label: 'Work Sans', family: "'Work Sans', sans-serif" }
];

const Config = () => {
  const { config, updateConfig, isOnline } = useStudy();
  
  // Carregar configurações salvas no localStorage na inicialização
  useEffect(() => {
    const savedConfig = localStorage.getItem('studyPro_config');
    if (savedConfig) {
      try {
        JSON.parse(savedConfig);
      } catch (e) {
        console.error('Erro ao carregar config:', e);
      }
    }
    
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('studypro_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const [apiKey, setApiKey] = useState(config?.geminiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('studypro_font') || 'Nunito';
  });

  useEffect(() => {
    if (config?.geminiKey !== undefined) {
      setApiKey(config.geminiKey);
    }
  }, [config]);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_key', apiKey);
    updateConfig({ geminiKey: apiKey });
    setSaveStatus('✅ Gemini salvo!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  useEffect(() => {
    const font = FONTS.find(f => f.name === selectedFont) || FONTS[0];
    document.documentElement.style.setProperty('--app-font', font.family);
    document.body.style.fontFamily = font.family;
  }, [selectedFont]);

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studypro_theme', theme);
  };

  const handleFontChange = (fontName) => {
    setSelectedFont(fontName);
    localStorage.setItem('studypro_font', fontName);
    const font = FONTS.find(f => f.name === fontName);
    if (font) {
      document.documentElement.style.setProperty('--app-font', font.family);
      document.body.style.fontFamily = font.family;
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* API Key Gemini */}
      <div className="card mb16">
        <div className="card-title">🔑 API Key — Gemini (Google)</div>
        <div className="note warn mb16">
          ⚠️ Necessária para extrair questões de PDF com Gemini. 
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{color:'var(--acc)'}}>Obter chave gratuita →</a>
        </div>
        <div className="fg">
          <label className="flbl">Chave Gemini</label>
          <div className="flex ac gap8">
            <input
              className="finp"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-sec"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ padding: '8px 12px' }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div className="flex ac gap12 mt16">
          <button className="btn btn-pri" onClick={handleSaveApiKey}>💾 Salvar</button>
          <span style={{ fontSize: '13px' }}>{saveStatus}</span>
        </div>
      </div>

      <div className="card mb16">
        <div className="card-title">🎨 Tema</div>
        <div className="g2" style={{gap: '8px'}}>
          <button className="btn btn-sec" onClick={() => setTheme('dark')} style={{fontSize: '11px'}}>🌙 Padrão Escuro</button>
          <button className="btn btn-sec" onClick={() => setTheme('light')} style={{fontSize: '11px'}}>☀️ Padrão Claro</button>
          <button className="btn btn-sec" onClick={() => setTheme('glass')} style={{fontSize: '11px', background: 'rgba(96,165,250,.2)', borderColor: '#60a5fa', color: '#60a5fa'}}>🧊 Glassmorphism</button>
          <button className="btn btn-sec" onClick={() => setTheme('cyberpunk')} style={{fontSize: '11px', background: 'rgba(0,240,255,.15)', borderColor: '#00f0ff', color: '#00f0ff'}}>⚡ Cyberpunk</button>
          <button className="btn btn-sec" onClick={() => setTheme('minimal')} style={{fontSize: '11px', background: 'rgba(99,102,241,.12)', borderColor: '#6366f1', color: '#6366f1'}}>☁️ Minimalista</button>
          <button className="btn btn-sec" onClick={() => setTheme('space')} style={{fontSize: '11px', background: 'rgba(167,139,250,.15)', borderColor: '#a78bfa', color: '#a78bfa'}}>🌌 Deep Space</button>
          <button className="btn btn-sec" onClick={() => setTheme('ocean')} style={{fontSize: '11px', background: 'rgba(14,165,233,.15)', borderColor: '#0ea5e9', color: '#0ea5e9'}}>🌊 Ocean</button>
          <button className="btn btn-sec" onClick={() => setTheme('yellow')} style={{fontSize: '11px', background: 'rgba(250,204,21,.15)', borderColor: '#facc15', color: '#facc15'}}>⚡ Amarelo</button>
          <button className="btn btn-sec" onClick={() => setTheme('black')} style={{fontSize: '11px', background: '#0a0a0a', borderColor: '#404040', color: '#fafafa'}}>⚫ Preto</button>
        </div>
      </div>

      <div className="card mb16">
        <div className="card-title">🔤 Fonte</div>
        <div className="fg">
          <label className="flbl">Escolha a fonte do site</label>
          <select
            className="fsel"
            value={selectedFont}
            onChange={(e) => handleFontChange(e.target.value)}
          >
            {FONTS.map((font) => (
              <option key={font.name} value={font.name}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <p className="note" style={{ marginTop: '8px', fontSize: '12px' }}>
          💡 A fonte é aplicada instantaneamente em toda a aplicação
        </p>
      </div>

      <div className="card mb16">
        <div className="card-title">🔥 Firebase</div>
        <div id="fb-status-card">
          <div className={`note ${isOnline ? 'ok' : 'err'}`}>
            <div className={`sync-dot ${isOnline ? 'ok' : 'offline'}`} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle' }}></div>
            <span>{isOnline ? 'Firebase Realtime Database conectado e sincronizando em tempo real.' : 'Offline - Dados locais apenas.'}</span>
          </div>
        </div>
      </div>

      <div className="card mb16">
        <div className="card-title">📦 Backup JSON</div>
        <div className="note info mb16">
          💡 <span>Backup extra além do Firebase.</span>
        </div>
        <div className="flex gap8 fw">
          <button className="btn btn-sec" onClick={() => alert('Exportar - implementar')}>💾 Exportar</button>
          <button className="btn btn-sec" onClick={() => alert('Importar - implementar')}>📂 Importar</button>
          <button className="btn btn-danger" onClick={() => alert('Apagar - implementar')}>🗑️ Apagar Tudo</button>
        </div>
      </div>
    </div>
  );
};

export default Config;
