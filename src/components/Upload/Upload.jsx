import React, { useState, useRef } from 'react';
import { useStudy } from '../../context/StudyContext';
import { geminiService } from '../../services/geminiService';

const Upload = () => {
  const { config, addQuestion, setView } = useStudy();
  const fileInputRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Por favor, selecione um arquivo PDF válido.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo: 20MB.');
        return;
      }
      setSelectedFile(file);
      setError('');
      setStatus(`Arquivo selecionado: ${file.name}`);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processPDF = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo PDF primeiro.');
      return;
    }

    const apiKey = config?.geminiKey;
    if (!apiKey) {
      setError('API Key do Gemini não configurada. Configure em Configurações primeiro.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStatus('Enviando PDF para análise...');
    setProgress({ current: 0, total: 0 });

    try {
      const questions = await geminiService.extractQuestionsFromPDF(selectedFile, apiKey);

      if (questions.length === 0) {
        setStatus('Nenhuma questão de múltipla escolha encontrada no PDF.');
        setExtractedQuestions([]);
      } else {
        setExtractedQuestions(questions);
        setProgress({ current: 0, total: questions.length });
        setStatus(`${questions.length} questões encontradas! Clique em "Salvar no Banco" para adicionar.`);
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar PDF.');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveQuestions = async () => {
    if (extractedQuestions.length === 0) return;

    setIsProcessing(true);
    setStatus('Salvando questões no banco...');

    let savedCount = 0;
    for (let i = 0; i < extractedQuestions.length; i++) {
      const q = extractedQuestions[i];
      try {
        const questionData = {
          id: `q_${Date.now()}_${i}`,
          enunciado: q.enunciado || '',
          alternativas: q.alternativas || [],
          respostaCorreta: q.respostaCorreta || '',
          disciplina: q.disciplina || 'Geral',
          topico: q.topico || '',
          dificuldade: q.dificuldade || 'media',
          fonte: q.fonte || selectedFile?.name?.replace('.pdf', '') || 'PDF Importado',
          explicacao: q.explicacao || '',
          geradoIA: true,
          createdAt: new Date().toISOString()
        };

        await addQuestion(questionData);
        savedCount++;
        setProgress({ current: savedCount, total: extractedQuestions.length });
      } catch (err) {
        console.error('Erro ao salvar questão:', err);
      }
    }

    setStatus(`${savedCount} questões salvas com sucesso!`);
    setExtractedQuestions([]);
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setExtractedQuestions([]);
    setStatus('');
    setError('');
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeQuestion = (index) => {
    setExtractedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Card de Upload */}
      <div className="card mb16">
        <div className="card-title">📤 Upload de PDF</div>
        <div className="note info mb16">
          💡 <span>Extraia questões automaticamente de PDFs usando IA Gemini. Máximo: 20MB.</span>
        </div>

        {!config?.geminiKey && (
          <div className="note warn mb16">
            ⚠️ <span>API Key do Gemini não configurada. <button onClick={() => setView('config')} style={{ color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Clique aqui para configurar</button>.</span>
          </div>
        )}

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
            onClick={handleUploadClick}
            disabled={isProcessing}
          >
            📂 Selecionar PDF
          </button>
          {selectedFile && (
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        {selectedFile && extractedQuestions.length === 0 && (
          <div className="flex ac gap12">
            <button
              className="btn btn-pri"
              onClick={processPDF}
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Processando...' : '🤖 Extrair Questões'}
            </button>
            <button
              className="btn btn-sec"
              onClick={clearAll}
              disabled={isProcessing}
            >
              ❌ Cancelar
            </button>
          </div>
        )}

        {status && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--pri)' }}>
            {status}
          </div>
        )}

        {error && (
          <div className="note err" style={{ marginTop: '12px' }}>
            ❌ {error}
          </div>
        )}

        {isProcessing && progress.total > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>
              Progresso: {progress.current} / {progress.total}
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--surf2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(progress.current / progress.total) * 100}%`,
                height: '100%',
                background: 'var(--pri)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Lista de Questões Extraídas */}
      {extractedQuestions.length > 0 && (
        <div className="card mb16">
          <div className="flex ac jb mb16">
            <div className="card-title">📋 Questões Encontradas ({extractedQuestions.length})</div>
            <div className="flex ac gap8">
              <button
                className="btn btn-pri btn-sm"
                onClick={saveQuestions}
                disabled={isProcessing}
              >
                💾 Salvar no Banco
              </button>
              <button
                className="btn btn-sec btn-sm"
                onClick={clearAll}
                disabled={isProcessing}
              >
                🗑️ Limpar
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {extractedQuestions.map((q, index) => (
              <div
                key={index}
                className="q-card"
                style={{ padding: '16px', position: 'relative' }}
              >
                <button
                  onClick={() => removeQuestion(index)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: 'var(--danger)',
                    padding: '4px'
                  }}
                  title="Remover questão"
                >
                  ✕
                </button>

                <div className="q-meta" style={{ marginBottom: '8px' }}>
                  <span className="badge bb">{q.disciplina || 'Geral'}</span>
                  {q.topico && <span className="badge bm">{q.topico}</span>}
                  <span className={`badge ${q.dificuldade === 'facil' ? 'dif-facil' : q.dificuldade === 'dificil' ? 'dif-dificil' : 'dif-media'}`}>
                    {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'dificil' ? 'Difícil' : 'Média'}
                  </span>
                  <span className="badge bai">🤖 IA</span>
                </div>

                <div className="q-text" style={{ marginBottom: '12px' }}>
                  {q.enunciado}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {q.alternativas?.map((alt) => (
                    <div
                      key={alt.letra}
                      className={`alt ${alt.letra === q.respostaCorreta ? 'sel' : ''}`}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: alt.letra === q.respostaCorreta ? 'var(--pri-dim)' : 'var(--surf2)',
                        border: alt.letra === q.respostaCorreta ? '1px solid var(--pri)' : '1px solid var(--brd)',
                        fontSize: '13px'
                      }}
                    >
                      <strong>{alt.letra})</strong> {alt.texto}
                      {alt.letra === q.respostaCorreta && <span style={{ marginLeft: '8px' }}>✅</span>}
                    </div>
                  ))}
                </div>

                {q.explicacao && (
                  <div className="note info" style={{ fontSize: '12px' }}>
                    <strong>Explicação:</strong> {q.explicacao}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;