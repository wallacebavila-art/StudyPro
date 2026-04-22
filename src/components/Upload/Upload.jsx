import { useState, useRef } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, getTopicos } from '../../config/editalConfig';
import { geminiService } from '../../services/geminiService';

const Upload = () => {
  const { addQuestion, config, setView } = useStudy();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0 });
  const [metodoExtracao, setMetodoExtracao] = useState('gemini');
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState({});

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
    
    if (metodoExtracao === 'gemini' && !config?.geminiKey) {
      setStatus('API Key do Gemini não configurada.');
      return;
    }

    setIsProcessing(true);
    setProgress({ stage: 'Iniciando...', percent: 10 });

    try {
      if (metodoExtracao === 'gemini') {
        setProgress({ stage: 'Extraindo com Gemini IA...', percent: 30 });
        const extracted = await geminiService.extractQuestionsFromPDF(selectedFile, config.geminiKey);
        setProgress({ stage: 'Processando questões...', percent: 80 });
        
        // Adicionar alerta para questões sem classificação
        const questionsWithAlert = extracted.map(q => ({
          ...q,
          _alerta: (!q.disciplina && !q.topico) ? '⚠️ QUESTÃO SEM CLASSIFICAÇÃO: Não foi possível associar esta questão a nenhuma disciplina ou tópico do edital. Requer revisão manual.' : ''
        }));
        
        setQuestions(questionsWithAlert);
        setStatus(`${questionsWithAlert.length} questões extraídas!`);
      } else {
        setStatus('Parser local não implementado nesta versão.');
      }
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

  // Estatísticas
  const stats = {
    total: questions.length,
    semClassificacao: questions.filter(q => !q.disciplina && !q.topico).length
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
          💡 <strong>Gemini IA:</strong> Extrai e classifica questões automaticamente conforme o edital.
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

        {/* Estatísticas com alerta de questões sem classificação */}
        {questions.length > 0 && (
          <div className="flex gap8 mt16" style={{ flexWrap: 'wrap' }}>
            <div className="note ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <strong>{stats.total}</strong> questões extraídas
            </div>
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
        
        return (
          <div key={i} className={`card mb12 ${semClassificacao ? 'border-err' : ''}`} style={{
            border: semClassificacao ? '2px solid var(--err)' : undefined
          }}>
            {/* Badge de alerta no topo */}
            {semClassificacao && (
              <div className="note err mb12" style={{ fontSize: '12px' }}>
                <strong>⚠️ ATENÇÃO:</strong> Questão não classificada! 
                Selecione a disciplina e tópico manualmente abaixo.
              </div>
            )}
            
            {/* Meta info */}
            <div className="q-meta" style={{ marginBottom: '12px' }}>
              <span className="badge bb">#{i + 1}</span>
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
          <div className="flex ac jb">
            <div>
              <span style={{ fontSize: '14px', color: 'var(--txt)' }}>{stats.total} questões para salvar</span>
              {stats.semClassificacao > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--err)' }}>
                  ({stats.semClassificacao} sem classificação!)
                </span>
              )}
            </div>
            <button className="btn btn-pri" onClick={saveAll}>
              💾 Salvar Todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
