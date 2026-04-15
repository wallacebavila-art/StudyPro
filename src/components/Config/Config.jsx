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
  const [status, setStatus] = useState('');
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('studypro_font') || 'Nunito';
  });

  useEffect(() => {
    const font = FONTS.find(f => f.name === selectedFont) || FONTS[0];
    document.documentElement.style.setProperty('--app-font', font.family);
    document.body.style.fontFamily = font.family;
  }, [selectedFont]);

  const handleSave = async () => {
    try {
      await updateConfig({ ...config, geminiKey: apiKey });
      setStatus('✅ Salvo!');
      setTimeout(() => setStatus(''), 2500);
    } catch (error) {
      setStatus('❌ Erro: ' + error.message);
    }
  };

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
      <div className="card mb16">
        <div className="card-title">🔑 API Key — Gemini</div>
        <div className="note warn mb16">
          ⚠️ <span>Necessária para PDF e IA. <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{color:'var(--acc)'}}>Obter chave gratuita →</a></span>
        </div>
        <div className="fg">
          <label className="flbl">Chave</label>
          <input
            className="finp"
            type="password"
            id="api-key-inp"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex ac gap12">
          <button className="btn btn-pri" onClick={handleSave}>💾 Salvar</button>
          <span id="cfg-status" style={{ fontSize: '13px' }}>{status}</span>
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