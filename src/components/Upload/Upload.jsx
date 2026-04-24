import { useState, useRef } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, getTopicos } from '../../config/editalConfig';
import { geminiService } from '../../services/geminiService';

const Upload = () => {
  const { addQuestion, config, setView, questions: existingQuestions } = useStudy();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0 });
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState({});
  
  // Estados para detecção de duplicatas
  const [duplicates, setDuplicates] = useState({}); // { index: { type, match, existingQuestion } }
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [showSaveSummary, setShowSaveSummary] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setQuestions([]);
      setStatus('');
    } else {
      setStatus('Por favor, selecione um arquivo PDF válido.');
    }
  };

  const processPDF = async () => {
    if (!selectedFile) return;
    
    if (!config?.geminiKey) {
      setStatus('API Key do Gemini não configurada. Configure em Ajustes.');
      return;
    }

    setIsProcessing(true);
    setProgress({ stage: 'Iniciando...', percent: 10 });

    try {
      setProgress({ stage: 'Extraindo com Gemini IA...', percent: 30 });
      const extracted = await geminiService.extractQuestionsFromPDF(selectedFile, config.geminiKey);
      
      setProgress({ stage: 'Processando questões...', percent: 80 });
        
        // Adicionar alerta para questões sem classificação
        const questionsWithAlert = extracted.map(q => ({
          ...q,
          _alerta: (!q.disciplina && !q.topico) ? '⚠️ QUESTÃO SEM CLASSIFICAÇÃO: Não foi possível associar esta questão a nenhuma disciplina ou tópico do edital. Requer revisão manual.' : ''
        }));
        
        setQuestions(questionsWithAlert);
        
        // Detectar duplicatas
        const dupInfo = detectDuplicates(questionsWithAlert);
        const dupCount = Object.keys(dupInfo).length;
        
        setStatus(`${questionsWithAlert.length} questões extraídas! ${dupCount > 0 ? `(${dupCount} possível${dupCount > 1 ? 's' : ''} duplicata${dupCount > 1 ? 's' : ''} detectada${dupCount > 1 ? 's' : ''})` : ''}`);
    } catch (error) {
      console.error('Erro:', error);
      setStatus('Erro ao processar PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ stage: '', percent: 0 });
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Limpar alerta se disciplina ou topico forem preenchidos
    if (field === 'disciplina' || field === 'topico') {
      if (updated[index].disciplina || updated[index].topico) {
        updated[index]._alerta = '';
      }
    }
    
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
  };

  const toggleExpand = (index) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Função para calcular similaridade de texto (Levenshtein simplificado)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    // Calcular similaridade baseada em substrings comuns
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 100;
    
    // Contar caracteres em comum
    let matches = 0;
    const shorterChars = shorter.split('');
    const longerChars = longer.split('');
    
    for (let i = 0; i < shorterChars.length; i++) {
      if (longerChars.includes(shorterChars[i])) {
        matches++;
        longerChars.splice(longerChars.indexOf(shorterChars[i]), 1);
      }
    }
    
    return (matches / longer.length) * 100;
  };

  // Função para extrair ID da questão (ex: [Q4207411])
  const extractQuestionId = (text) => {
    if (!text) return null;
    const match = text.match(/\[Q(\d+)\]/);
    return match ? match[1] : null;
  };

  // Função para detectar duplicatas
  const detectDuplicates = (extractedQuestions) => {
    const existingArray = Object.values(existingQuestions || {});
    const newDuplicates = {};
    
    extractedQuestions.forEach((q, index) => {
      const extractedId = extractQuestionId(q.enunciado);
      
      // Verificar por ID exato
      for (const existing of existingArray) {
        const existingId = extractQuestionId(existing.enunciado);
        
        // Match por ID exato
        if (extractedId && existingId && extractedId === existingId) {
          newDuplicates[index] = {
            type: 'id_exato',
            match: `ID: [Q${extractedId}]`,
            existingQuestion: existing,
            confidence: 100
          };
          return;
        }
        
        // Match por similaridade de enunciado (>85%)
        const enunciadoSimilarity = calculateSimilarity(q.enunciado, existing.enunciado);
        if (enunciadoSimilarity > 85) {
          newDuplicates[index] = {
            type: 'enunciado_similar',
            match: `${enunciadoSimilarity.toFixed(0)}% similar`,
            existingQuestion: existing,
            confidence: enunciadoSimilarity
          };
          return;
        }
        
        // Match por similaridade de alternativas (>90% das alternativas iguais)
        if (q.alternativas && existing.alternativas) {
          const altTexts1 = q.alternativas.map(a => a.texto?.toLowerCase()?.trim()).filter(Boolean);
          const altTexts2 = existing.alternativas.map(a => a.texto?.toLowerCase()?.trim()).filter(Boolean);
          
          if (altTexts1.length > 0 && altTexts2.length > 0) {
            let matchingAlts = 0;
            altTexts1.forEach(alt1 => {
              if (altTexts2.some(alt2 => calculateSimilarity(alt1, alt2) > 80)) {
                matchingAlts++;
              }
            });
            
            const altSimilarity = (matchingAlts / Math.max(altTexts1.length, altTexts2.length)) * 100;
            if (altSimilarity > 90) {
              newDuplicates[index] = {
                type: 'alternativas_similares',
                match: `${altSimilarity.toFixed(0)}% alternativas iguais`,
                existingQuestion: existing,
                confidence: altSimilarity
              };
              return;
            }
          }
        }
      }
    });
    
    setDuplicates(newDuplicates);
    return newDuplicates;
  };

  // Abrir modal de comparação
  const openCompareModal = (index) => {
    const dupInfo = duplicates[index];
    if (dupInfo) {
      setCompareData({
        index,
        extracted: questions[index],
        existing: dupInfo.existingQuestion,
        matchInfo: dupInfo
      });
      setShowCompareModal(true);
    }
  };

  // Estatísticas de duplicatas
  const duplicateStats = {
    totalDuplicates: Object.keys(duplicates).length,
    idMatches: Object.values(duplicates).filter(d => d.type === 'id_exato').length,
    similarMatches: Object.values(duplicates).filter(d => d.type !== 'id_exato').length
  };

  // Extrair número de identificação do enunciado (ex: [Q3247383])
  const extrairIdQuestao = (enunciado) => {
    const match = (enunciado || '').match(/\[Q(\d+)\]/);
    return match ? match[1] : null;
  };

  // Gerar novo ID único para questão
  const gerarIdQuestao = () => {
    return `Q${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  const saveAll = async () => {
    let saved = 0;
    for (const q of questions) {
      if (q.enunciado.trim()) {
        // Adicionar ID automático [Qxxxx] ao enunciado se não existir
        let enunciadoComId = q.enunciado;
        if (!extrairIdQuestao(enunciadoComId)) {
          const novoId = gerarIdQuestao();
          enunciadoComId = `[${novoId}] ${enunciadoComId}`;
        }

        const questionData = {
          ...q,
          enunciado: enunciadoComId,
          updatedAt: new Date().toISOString()
        };

        await addQuestion(questionData);
        saved++;
      }
    }
    setStatus(`${saved} questões salvas!`);
    setQuestions([]);
    setTimeout(() => setStatus(''), 3000);
  };

  // Estatísticas
  const stats = {
    total: questions.length,
    semClassificacao: questions.filter(q => !q.disciplina && !q.topico).length,
    duplicatas: duplicateStats.totalDuplicates,
    novas: questions.length - duplicateStats.totalDuplicates
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Upload de PDF */}
      <div className="card mb16">
        <div className="card-title">📄 Extrair Questões de PDF</div>
        
        {/* Aviso de API Key */}
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
          💡 <strong>Gemini:</strong> IA do Google. Boa precisão, grátis com limites. 
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: 'var(--acc)' }}>Obter API Key →</a>
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

        {selectedFile && questions.length === 0 && !isProcessing && (
          <button
            className="btn btn-pri"
            onClick={processPDF}
            disabled={isProcessing}
            style={{ width: '100%', padding: '14px' }}
          >
            🚀 Iniciar Extração via Gemini IA
          </button>
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

        {status && (
          <div className={`note ${status.includes('Erro') ? 'err' : 'ok'} mt16`}>
            {status}
          </div>
        )}

        {/* Estatísticas com alerta de questões sem classificação e duplicatas */}
        {questions.length > 0 && (
          <div className="flex gap8 mt16" style={{ flexWrap: 'wrap' }}>
            <div className="note ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <strong>{stats.total}</strong> questões extraídas
            </div>
            {stats.duplicatas > 0 && (
              <div className="note warn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>🔄</span>
                <strong>{stats.duplicatas}</strong> duplicata{stats.duplicatas > 1 ? 's' : ''}
              </div>
            )}
            {stats.semClassificacao > 0 && (
              <div className="note err" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>🚨</span>
                <strong>{stats.semClassificacao}</strong> sem classificação
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de questões extraídas */}
      {questions.map((q, i) => {
        const isExpanded = expanded[i];
        const semClassificacao = !q.disciplina && !q.topico;
        const isDuplicate = duplicates[i];
        
        return (
          <div key={i} className={`card mb12 ${semClassificacao ? 'border-err' : ''} ${isDuplicate ? 'border-warn' : ''}`} style={{
            border: semClassificacao ? '2px solid var(--err)' : isDuplicate ? '2px solid var(--warn)' : undefined,
            background: isDuplicate ? 'rgba(245, 158, 11, 0.05)' : undefined
          }}>
            {/* Badge de alerta no topo */}
            {semClassificacao && (
              <div className="note err mb12" style={{ fontSize: '12px' }}>
                <strong>⚠️ ATENÇÃO:</strong> Questão não classificada! 
                Selecione a disciplina e tópico manualmente abaixo.
              </div>
            )}
            
            {/* Badge de duplicata */}
            {isDuplicate && (
              <div className="note warn mb12" style={{ fontSize: '12px' }}>
                <strong>🔄 DUPLICATA DETECTADA:</strong> {isDuplicate.match}
                <button 
                  onClick={() => openCompareModal(i)}
                  style={{ 
                    marginLeft: '8px', 
                    color: 'var(--acc)', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '11px'
                  }}
                >
                  Ver comparação lado a lado →
                </button>
              </div>
            )}
            
            {/* Meta info */}
            <div className="q-meta" style={{ marginBottom: '12px' }}>
              <span className="badge bb">#{i + 1}</span>
              {isDuplicate && (
                <span className="badge" style={{ background: 'var(--warn)', color: '#000' }}>
                  🔄 DUPLICATA {isDuplicate.match}
                </span>
              )}
              {semClassificacao && (
                <span className="badge" style={{ background: 'var(--err)', color: '#fff' }}>
                  🚨 SEM CLASSIFICAÇÃO
                </span>
              )}
              {q.disciplina && <span className="badge bb">{q.disciplina}</span>}
              {q.topico && <span className="badge bm">{q.topico}</span>}
              {q.geradoIA && <span className="badge bai">🤖 IA</span>}
            </div>

            {/* Info da Banca/Prova */}
            {(q.banca || q.orgao || q.ano || q.cargo) && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                background: 'var(--surf2)', 
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--txt)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {q.banca && (
                  <span><strong>📝 Banca:</strong> {q.banca}</span>
                )}
                {q.orgao && (
                  <span><strong>🏢 Órgão:</strong> {q.orgao}</span>
                )}
                {q.ano && (
                  <span><strong>📅 Ano:</strong> {q.ano}</span>
                )}
                {q.cargo && (
                  <span><strong>💼 Cargo:</strong> {q.cargo}</span>
                )}
                {q.prova && (
                  <span><strong>📄 Prova:</strong> {q.prova}</span>
                )}
              </div>
            )}

            {/* Preview ou Form */}
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
                    <label className="flbl">Disciplina {semClassificacao && <span style={{color: 'var(--err)'}}>*</span>}</label>
                    <select
                      className={`fsel ${semClassificacao ? 'border-err' : ''}`}
                      value={q.disciplina}
                      onChange={(e) => {
                        updateQuestion(i, 'disciplina', e.target.value);
                        updateQuestion(i, 'topico', '');
                      }}
                      style={semClassificacao ? { borderColor: 'var(--err)' } : {}}
                    >
                      <option value="">Selecione...</option>
                      {DISCIPLINAS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="flbl">Tópico {semClassificacao && <span style={{color: 'var(--err)'}}>*</span>}</label>
                    <select
                      className={`fsel ${semClassificacao ? 'border-err' : ''}`}
                      value={q.topico}
                      onChange={(e) => updateQuestion(i, 'topico', e.target.value)}
                      disabled={!q.disciplina}
                      style={semClassificacao ? { borderColor: 'var(--err)' } : {}}
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

                <div className="fg mb12">
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
              </>
            )}

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

      {/* Sticky footer para salvar */}
      {questions.length > 0 && (
        <div className="card" style={{ 
          position: 'sticky', 
          bottom: '16px', 
          background: 'var(--bg)', 
          border: '1px solid var(--brd)'
        }}>
          <div className="flex ac jb" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '14px', color: 'var(--txt)' }}>
                {stats.total} questões • {stats.novas} novas
                {stats.duplicatas > 0 && (
                  <span style={{ marginLeft: '8px', color: 'var(--warn)', fontWeight: 600 }}>
                    • {stats.duplicatas} duplicata{stats.duplicatas > 1 ? 's' : ''}
                  </span>
                )}
              </span>
              {stats.semClassificacao > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--err)' }}>
                  ({stats.semClassificacao} sem classificação!)
                </span>
              )}
            </div>
            <button 
              className="btn btn-pri" 
              onClick={() => stats.duplicatas > 0 ? setShowSaveSummary(true) : saveAll()}
            >
              {stats.duplicatas > 0 ? '🔍 Revisar antes de Salvar' : '💾 Salvar Todas'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Comparação Lado a Lado */}
      {showCompareModal && compareData && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowCompareModal(false)}
          style={{ 
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surf)',
              borderRadius: '12px',
              width: '95vw',
              maxWidth: '1200px',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '20px'
            }}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--brd)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                🔄 Comparação de Duplicata
              </h3>
              <button 
                onClick={() => setShowCompareModal(false)}
                style={{
                  background: 'var(--surf2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Match Info */}
            <div style={{ 
              padding: '10px 14px', 
              background: 'var(--warn)', 
              color: '#000',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              ⚠️ Similaridade: {compareData.matchInfo.match} 
              ({compareData.matchInfo.type === 'id_exato' ? 'ID Exato' : 
                compareData.matchInfo.type === 'enunciado_similar' ? 'Enunciado Similar' : 'Alternativas Similares'})
            </div>

            {/* Comparação Lado a Lado */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px'
            }}>
              {/* Questão Extraída */}
              <div style={{ 
                padding: '16px', 
                background: 'var(--surf1)', 
                borderRadius: '8px',
                border: '2px solid var(--pri)'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px', 
                  fontSize: '14px',
                  color: 'var(--pri)'
                }}>
                  📥 Questão Extraída do PDF
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>ENUNCIADO</label>
                  <div style={{ 
                    padding: '10px', 
                    background: 'var(--bg)', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {compareData.extracted.enunciado}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>ALTERNATIVAS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {compareData.extracted.alternativas?.map((alt, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: compareData.extracted.respostaCorreta === alt.letra ? 'var(--pri)' : 'var(--surf2)',
                          color: compareData.extracted.respostaCorreta === alt.letra ? '#000' : 'var(--txt)',
                          fontWeight: 700,
                          fontSize: '11px'
                        }}>
                          {alt.letra}
                        </span>
                        <span>{alt.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>CLASSIFICAÇÃO</label>
                  <div style={{ fontSize: '12px' }}>
                    {compareData.extracted.disciplina || '—'} / {compareData.extracted.topico || '—'}
                  </div>
                </div>
              </div>

              {/* Questão Existente no Banco */}
              <div style={{ 
                padding: '16px', 
                background: 'var(--surf1)', 
                borderRadius: '8px',
                border: '2px solid var(--acc)'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px', 
                  fontSize: '14px',
                  color: 'var(--acc)'
                }}>
                  🏦 Questão no Banco
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>ENUNCIADO</label>
                  <div style={{ 
                    padding: '10px', 
                    background: 'var(--bg)', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {compareData.existing.enunciado}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>ALTERNATIVAS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {compareData.existing.alternativas?.map((alt, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'var(--bg)',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: compareData.existing.respostaCorreta === alt.letra ? 'var(--pri)' : 'var(--surf2)',
                          color: compareData.existing.respostaCorreta === alt.letra ? '#000' : 'var(--txt)',
                          fontWeight: 700,
                          fontSize: '11px'
                        }}>
                          {alt.letra}
                        </span>
                        <span>{alt.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 600 }}>CLASSIFICAÇÃO</label>
                  <div style={{ fontSize: '12px' }}>
                    {compareData.existing.disciplina || '—'} / {compareData.existing.topico || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--brd)'
            }}>
              <button 
                onClick={() => {
                  removeQuestion(compareData.index);
                  setShowCompareModal(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '2px solid var(--err)',
                  background: 'var(--err)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🗑️ Remover Duplicata
              </button>
              <button 
                onClick={() => setShowCompareModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--brd)',
                  background: 'var(--surf2)',
                  color: 'var(--txt)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✓ Manter Questão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo antes de Salvar */}
      {showSaveSummary && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowSaveSummary(false)}
          style={{ 
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surf)',
              borderRadius: '12px',
              width: '90vw',
              maxWidth: '500px',
              padding: '24px'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', textAlign: 'center' }}>
              ⚠️ Resumo antes de Salvar
            </h3>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                padding: '14px', 
                background: 'var(--surf1)', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--pri)' }}>
                  {stats.novas}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--txt)' }}>Questões Novas</div>
              </div>
              
              {stats.duplicatas > 0 && (
                <div style={{ 
                  padding: '14px', 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid var(--warn)'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warn)' }}>
                    {stats.duplicatas}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--txt)' }}>Duplicatas Detectadas</div>
                  <div style={{ fontSize: '11px', color: 'var(--mut)', marginTop: '4px' }}>
                    {duplicateStats.idMatches} por ID • {duplicateStats.similarMatches} por similaridade
                  </div>
                </div>
              )}
              
              {stats.semClassificacao > 0 && (
                <div style={{ 
                  padding: '14px', 
                  background: 'rgba(248, 81, 73, 0.1)', 
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid var(--err)'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--err)' }}>
                    {stats.semClassificacao}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--txt)' }}>Sem Classificação</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.duplicatas > 0 && (
                <button 
                  onClick={() => {
                    // Remover todas as duplicatas
                    const indicesToRemove = Object.keys(duplicates).map(Number).sort((a, b) => b - a);
                    let updated = [...questions];
                    indicesToRemove.forEach(idx => {
                      updated = updated.filter((_, i) => i !== idx);
                    });
                    setQuestions(updated);
                    setDuplicates({});
                    setShowSaveSummary(false);
                    // Salvar após remover
                    setTimeout(() => saveAll(), 100);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--warn)',
                    background: 'var(--warn)',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🧹 Ignorar Duplicatas e Salvar {stats.novas} Questões
                </button>
              )}
              
              <button 
                onClick={() => {
                  setShowSaveSummary(false);
                  saveAll();
                }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--pri)',
                  background: 'var(--pri)',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                💾 Salvar Todas ({stats.total} questões)
              </button>
              
              <button 
                onClick={() => setShowSaveSummary(false)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--brd)',
                  background: 'var(--surf2)',
                  color: 'var(--txt)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✏️ Revisar Manualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
