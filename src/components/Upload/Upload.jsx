import React, { useState, useRef } from 'react';
import { useStudy } from '../../context/StudyContext';
import { geminiService } from '../../services/geminiService';
import { pdfApiService } from '../../services/pdfApiService';
import { EDITAL_ESTRUTURA, DISCIPLINAS, getTopicos } from '../../config/editalConfig';

const Upload = () => {
  const { config, addQuestion, setView } = useStudy();
  const fileInputRef = useRef(null);
  
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [metodoExtracao, setMetodoExtracao] = useState('gemini'); // 'gemini' | 'parser'
  const [stats, setStats] = useState({ total: 0, duplicates: 0 });
  const [expanded, setExpanded] = useState({});
  const [progress, setProgress] = useState({ percent: 0, stage: '' });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setStatus('❌ Por favor, selecione um arquivo PDF válido.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setStatus('❌ Arquivo muito grande. Máximo: 20MB.');
        return;
      }
      if (file.size > 4 * 1024 * 1024 && metodoExtracao === 'parser') {
        setStatus('⚠️ Arquivo > 4MB. Troque para método Gemini ou use PDF menor.');
        setMetodoExtracao('gemini');
      }
      setSelectedFile(file);
      setStatus(`📄 Arquivo selecionado: ${file.name}`);
    }
  };

  const processPDF = async () => {
    if (!selectedFile) {
      setStatus('❌ Selecione um arquivo PDF primeiro.');
      return;
    }

    // Validar tamanho para parser local
    if (metodoExtracao === 'parser' && selectedFile.size > 4 * 1024 * 1024) {
      setStatus('❌ Parser local aceita apenas PDFs até 4MB. Use o método Gemini.');
      return;
    }

    // Validar API Key apenas para Gemini
    if (metodoExtracao === 'gemini') {
      const apiKey = config?.geminiKey;
      if (!apiKey) {
        setStatus('❌ Configure a API Key do Gemini em Configurações');
        return;
      }
    }

    setIsProcessing(true);
    setProgress({ percent: 0, stage: 'Preparando...' });
    
    // Simular progresso apenas para Gemini (parser é mais rápido)
    let progressInterval = null;
    if (metodoExtracao === 'gemini') {
      const progressStages = [
        { percent: 5, stage: '📤 Enviando PDF...', delay: 500 },
        { percent: 15, stage: '📖 Convertendo para análise...', delay: 1000 },
        { percent: 30, stage: '🔍 Analisando estrutura do documento...', delay: 1500 },
        { percent: 50, stage: '🤖 Identificando questões...', delay: 2000 },
        { percent: 70, stage: '📝 Extraindo enunciados...', delay: 2000 },
        { percent: 85, stage: '✏️ Processando alternativas...', delay: 1500 },
        { percent: 95, stage: '📋 Organizando dados...', delay: 1000 }
      ];
      
      let stageIndex = 0;
      progressInterval = setInterval(() => {
        if (stageIndex < progressStages.length) {
          setProgress(progressStages[stageIndex]);
          stageIndex++;
        }
      }, 1200);
    }

    try {
      let extractedQuestions = [];
      let resultadoAPI = null;

      if (metodoExtracao === 'gemini') {
        // Método Gemini (IA)
        console.log('🤖 Usando Gemini para extração...');
        extractedQuestions = await geminiService.extractQuestionsFromPDF(selectedFile, config?.geminiKey);
      } else {
        // Método Parser Local (API Vercel)
        console.log('🔍 Usando Parser Local para extração...');
        setProgress({ percent: 30, stage: '📤 Enviando para API...' });
        resultadoAPI = await pdfApiService.extractQuestionsFromPDF(selectedFile);
        extractedQuestions = resultadoAPI.questoes || [];
        
        // Log para debug
        console.log('📊 Resultado Parser Local:', {
          total: resultadoAPI.total,
          arquivo: resultadoAPI.arquivo,
          paginas: resultadoAPI.paginas
        });
        
        if (extractedQuestions.length > 0) {
          console.log('📝 Primeira questão:', extractedQuestions[0]);
        }
      }

      if (progressInterval) clearInterval(progressInterval);
      setProgress({ percent: 100, stage: '✅ Concluído!' });
      
      if (extractedQuestions.length === 0) {
        setStatus(`⚠️ Nenhuma questão encontrada no PDF via ${metodoExtracao === 'gemini' ? 'Gemini' : 'Parser Local'}.`);
        setStats({ total: 0, duplicates: 0 });
      } else {
        setQuestions(extractedQuestions);
        const dupCount = detectDuplicates(extractedQuestions);
        setStats({ total: extractedQuestions.length, duplicates: dupCount });
        const metodoNome = metodoExtracao === 'gemini' ? 'Gemini' : 'Parser Local';
        setStatus(`✅ ${extractedQuestions.length} questões extraídas via ${metodoNome}! ${dupCount > 0 ? `(${dupCount} possíveis duplicatas)` : ''}`);
      }
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      const errorMsg = err.message?.includes('interpretar') 
        ? `${err.message} (Abra o console F12 para ver detalhes)` 
        : err.message;
      setStatus(`❌ Erro: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateAlternativa = (qIndex, altIndex, value) => {
    const updated = [...questions];
    updated[qIndex].alternativas[altIndex].texto = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    // Recalcular duplicatas
    const dupCount = detectDuplicates(updated);
    setStats({ total: updated.length, duplicates: dupCount });
  };

  // Função para detectar duplicatas por similaridade
  const detectDuplicates = (qs) => {
    let dupCount = 0;
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        if (isSimilar(qs[i].enunciado, qs[j].enunciado)) {
          dupCount++;
          break;
        }
      }
    }
    return dupCount;
  };

  // Comparar similaridade de strings (simples)
  const isSimilar = (a, b) => {
    if (!a || !b) return false;
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    return normalize(a) === normalize(b);
  };

  const toggleExpand = (index) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const saveAll = async () => {
    let saved = 0;
    for (const q of questions) {
      if (q.enunciado.trim()) {
        await addQuestion(q);
        saved++;
      }
    }
    setStatus(`${saved} questões salvas!`);
    setQuestions([]);
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Upload de PDF */}
      <div className="card mb16">
        <div className="card-title">📄 Extrair Questões de PDF</div>
        
        {!config?.geminiKey && (
          <div className="note warn mb16">
            ⚠️ API Key do Gemini não configurada. 
            <button 
              onClick={() => setView('config')} 
              style={{ color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clique aqui para configurar
            </button>
          </div>
        )}
        
        <div className="note info mb16">
          💡 <strong>Dois métodos disponíveis:</strong><br/>
          • <strong>Gemini IA</strong> - Melhor qualidade, classifica automaticamente, requer API Key<br/>
          • <strong>Parser Local</strong> - Rápido e gratuito, limite 4MB, sem classificação automática
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div className="flex ac gap12 mb16">
          <button
            className="btn btn-pri"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            📂 Selecionar PDF
          </button>
          {selectedFile && (
            <span style={{ fontSize: '13px' }}>
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        {selectedFile && questions.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Seletor de método */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: 600 }}>
                  Método de Extração
                </label>
                <select
                  className="f-sel"
                  value={metodoExtracao}
                  onChange={(e) => setMetodoExtracao(e.target.value)}
                  disabled={isProcessing}
                  style={{ minWidth: '220px', marginBottom: 0 }}
                >
                  <option value="gemini">🤖 Gemini IA (Melhor qualidade)</option>
                  <option value="parser">🔍 Parser Local (Rápido, até 4MB)</option>
                </select>
              </div>
              
              <button
                className="btn btn-pri"
                onClick={processPDF}
                disabled={isProcessing}
                style={{ marginTop: '20px' }}
              >
                {isProcessing ? '⏳ Processando...' : `🚀 Extrair via ${metodoExtracao === 'gemini' ? 'Gemini' : 'Parser'}`}
              </button>
            </div>
            
            {/* Info do método selecionado */}
            <div className={`note ${metodoExtracao === 'gemini' ? 'info' : 'warn'} mb8`} style={{ fontSize: '12px' }}>
              {metodoExtracao === 'gemini' ? (
                <>💡 <strong>Gemini:</strong> Usa IA para extrair e classificar questões. Requer API Key. Funciona com PDFs grandes.</>
              ) : (
                <>⚡ <strong>Parser Local:</strong> Extrai apenas texto e alternativas. <strong>Limite: 4MB.</strong> Não classifica disciplinas automaticamente.</>
              )}
            </div>
          </div>
        )}

        {/* Barra de progresso */}
        {isProcessing && progress.percent > 0 && (
          <div className="mt16">
            <div style={{ marginBottom: '8px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{progress.stage}</span>
              <span style={{ fontWeight: 'bold' }}>{progress.percent}%</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'var(--surf2)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${progress.percent}%`, 
                height: '100%', 
                background: 'var(--pri)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Estatísticas */}
        {questions.length > 0 && (
          <div className="flex gap8 mt16" style={{ flexWrap: 'wrap' }}>
            <div className="note ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <strong>{stats.total}</strong> questões extraídas
            </div>
            {stats.duplicates > 0 && (
              <div className="note warn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <strong>{stats.duplicates}</strong> possíveis duplicatas
              </div>
            )}
          </div>
        )}

        {status && (
          <div className={`note ${status.includes('❌') ? 'err' : status.includes('✅') ? 'ok' : 'info'} mt16`}>
            {status}
          </div>
        )}
      </div>

      {/* Lista de questões - estilo Banco */}
      <div id="banco-list">
        {questions.map((q, i) => {
          const isDup = questions.some((other, j) => j !== i && isSimilar(q.enunciado, other.enunciado));
          const isExpanded = expanded[i];
          
          return (
            <div 
              key={q.id} 
              className={`q-card mb16 ${isDup ? 'border-warn' : ''}`}
              style={{ 
                borderLeft: isDup ? '4px solid var(--warn)' : '4px solid var(--ok)',
                transition: 'all 0.2s'
              }}
            >
              {/* q-meta - igual ao Banco */}
              <div className="q-meta" style={{ marginBottom: '12px' }}>
                <span className="badge bb">#{i + 1}</span>
                {isDup && (
                  <span className="badge" style={{ background: 'var(--warn)', color: '#000' }}>
                    ⚠️ Duplicata
                  </span>
                )}
                {q.disciplina && <span className="badge bb">{q.disciplina}</span>}
                {q.topico && <span className="badge bm">{q.topico}</span>}
                <span className={`badge ${q.dificuldade === 'facil' ? 'dif-facil' : q.dificuldade === 'dificil' ? 'dif-dificil' : 'dif-media'}`}>
                  {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'dificil' ? 'Difícil' : 'Média'}
                </span>
                {q.geradoIA && <span className="badge bai">🤖 IA</span>}
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--mut)', fontFamily: 'JetBrains Mono' }}>
                  {q.fonte || ''}
                </span>
              </div>

              {/* q-text - Preview colapsado ou Expandido */}
              {!isExpanded ? (
                <div className="q-text" onClick={() => toggleExpand(i)} style={{ cursor: 'pointer' }}>
                  {q.enunciado.substring(0, 150)}{q.enunciado.length > 150 ? '...' : ''}
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--acc)' }}>
                    📋 Alternativas: {q.alternativas.map(a => a.letra).join(', ')} • Clique para editar
                  </p>
                </div>
              ) : (
                <>
                  <div className="fg mb12">
                    <label className="flbl">Enunciado</label>
                    <textarea
                      className="finp"
                      rows={4}
                      value={q.enunciado}
                      onChange={(e) => updateQuestion(i, 'enunciado', e.target.value)}
                      placeholder="Digite o enunciado da questão..."
                    />
                  </div>

                  <div className="grid2 mb12">
                    <div className="fg">
                      <label className="flbl">Disciplina</label>
                      <select
                        className="fsel"
                        value={q.disciplina}
                        onChange={(e) => {
                          updateQuestion(i, 'disciplina', e.target.value);
                          updateQuestion(i, 'topico', ''); // Reset tópico ao mudar disciplina
                        }}
                      >
                        <option value="">Selecione...</option>
                        {DISCIPLINAS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="flbl">Tópico</label>
                      <select
                        className="fsel"
                        value={q.topico}
                        onChange={(e) => updateQuestion(i, 'topico', e.target.value)}
                        disabled={!q.disciplina}
                      >
                        <option value="">{q.disciplina ? 'Selecione...' : 'Escolha a disciplina primeiro'}</option>
                        {getTopicos(q.disciplina).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="fg mb12">
                    <label className="flbl">Alternativas</label>
                    {q.alternativas.map((alt, ai) => (
                      <div key={alt.letra} className="flex ac gap8 mb8">
                        <span style={{ 
                          width: '28px', 
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: q.respostaCorreta === alt.letra ? 'var(--pri)' : 'var(--surf2)',
                          color: q.respostaCorreta === alt.letra ? '#000' : 'var(--txt)',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          fontSize: '13px'
                        }}>{alt.letra}</span>
                        <input
                          className="finp"
                          style={{ flex: 1 }}
                          value={alt.texto}
                          onChange={(e) => updateAlternativa(i, ai, e.target.value)}
                          placeholder={`Alternativa ${alt.letra}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid2 mb12">
                    <div className="fg">
                      <label className="flbl">Resposta Correta</label>
                      <select
                        className="fsel"
                        value={q.respostaCorreta}
                        onChange={(e) => updateQuestion(i, 'respostaCorreta', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {q.alternativas.map((alt) => (
                          <option key={alt.letra} value={alt.letra}>{alt.letra}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="flbl">Dificuldade</label>
                      <select
                        className="fsel"
                        value={q.dificuldade}
                        onChange={(e) => updateQuestion(i, 'dificuldade', e.target.value)}
                      >
                        <option value="facil">Fácil</option>
                        <option value="media">Média</option>
                        <option value="dificil">Difícil</option>
                      </select>
                    </div>
                  </div>

                  <div className="fg">
                    <label className="flbl">Explicação (opcional)</label>
                    <textarea
                      className="finp"
                      rows={2}
                      value={q.explicacao}
                      onChange={(e) => updateQuestion(i, 'explicacao', e.target.value)}
                      placeholder="Explicação da resposta correta..."
                    />
                  </div>
                </>
              )}

              {/* q-actions - igual ao Banco */}
              <div className="q-actions" style={{ marginTop: '12px' }}>
                <button 
                  className="btn btn-sec btn-sm" 
                  onClick={() => toggleExpand(i)}
                >
                  {isExpanded ? '📄 Recolher' : '✏️ Editar'}
                </button>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => removeQuestion(i)}
                >
                  🗑️ Remover
                </button>
              </div>
            </div>
          );
        })}

        {questions.length > 0 && (
          <div className="card" style={{ 
            position: 'sticky', 
            bottom: '16px', 
            background: 'var(--bg)', 
            border: '1px solid var(--brd)'
          }}>
            <div className="flex ac jb">
              <div>
                <span style={{ fontSize: '14px', color: 'var(--txt)' }}>{stats.total} questões para salvar</span>
                {stats.duplicates > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--mut)' }}>
                    ({stats.duplicates} duplicatas)
                  </span>
                )}
              </div>
              <button className="btn btn-pri" onClick={saveAll}>
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;