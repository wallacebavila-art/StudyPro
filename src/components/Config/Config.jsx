import React, { useState, useEffect } from 'react';
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

  const handleSaveApiKey = async () => {
    try {
      await updateConfig({ ...config, geminiKey: apiKey });
      setSaveStatus('✅ API Key salva!');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (error) {
      setSaveStatus('❌ Erro ao salvar');
    }
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
        <div className="card-title">🔑 API Key — Gemini</div>
        <div className="note warn mb16">
          ⚠️ Necessária para extrair questões de PDF. 
          <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{color:'var(--acc)'}}>Obter chave gratuita →</a>
        </div>
        <div className="fg">
          <label className="flbl">Chave</label>
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
        <div className="flex gap8">
          <button className="btn btn-sec" onClick={() => setTheme('dark')}>🌙 Escuro</button>
          <button className="btn btn-sec" onClick={() => setTheme('light')}>☀️ Claro</button>
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