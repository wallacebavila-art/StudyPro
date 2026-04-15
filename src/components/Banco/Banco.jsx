import React, { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';

const Banco = () => {
  const { questions, deleteQuestion, addQuestion, config, setView } = useStudy();
  const [activeDisciplina, setActiveDisciplina] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    topico: '',
    dificuldade: '',
    errosOnly: ''
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    enunciado: '',
    disciplina: '',
    topico: '',
    dificuldade: 'media',
    respostaCorreta: 'A',
    alternativas: [
      { letra: 'A', texto: '' },
      { letra: 'B', texto: '' },
      { letra: 'C', texto: '' },
      { letra: 'D', texto: '' },
      { letra: 'E', texto: '' }
    ],
    explicacao: '',
    fonte: ''
  });

  const questionsList = useMemo(() => Object.values(questions), [questions]);

  // Questões filtradas por disciplina ativa e filtros adicionais
  const filteredQuestions = useMemo(() => {
    let filtered = questionsList;

    // Filtrar por disciplina ativa (se houver)
    if (activeDisciplina) {
      filtered = filtered.filter(q => q.disciplina === activeDisciplina);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(q =>
        (q.enunciado || '').toLowerCase().includes(search) ||
        (q.topico || '').toLowerCase().includes(search)
      );
    }

    if (filters.topico) {
      filtered = filtered.filter(q => q.topico === filters.topico);
    }

    if (filters.dificuldade) {
      filtered = filtered.filter(q => q.dificuldade === filters.dificuldade);
    }

    return filtered;
  }, [questionsList, activeDisciplina, filters]);

  const disciplinas = useMemo(() =>
    [...new Set(questionsList.map(q => q.disciplina).filter(Boolean))].sort(),
    [questionsList]
  );

  // Contagem de questões por disciplina
  const disciplinaCounts = useMemo(() => {
    const counts = {};
    questionsList.forEach(q => {
      const disc = q.disciplina || 'Sem disciplina';
      counts[disc] = (counts[disc] || 0) + 1;
    });
    return counts;
  }, [questionsList]);

  const topicos = useMemo(() => {
    const discFiltered = activeDisciplina
      ? questionsList.filter(q => q.disciplina === activeDisciplina)
      : questionsList;
    return [...new Set(discFiltered.map(q => q.topico).filter(Boolean))].sort();
  }, [questionsList, activeDisciplina]);

  const handleDisciplinaChange = (disciplina) => {
    setActiveDisciplina(disciplina);
    setFilters(prev => ({ ...prev, topico: '' })); // Limpar filtro de tópico
    setSelectedIds(new Set());
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedIds(new Set());
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await deleteQuestion(id);
    }
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    
    const questionData = {
      id: `q_${Date.now()}`,
      ...newQuestion,
      geradoIA: addMode === 'paste',
      createdAt: new Date().toISOString()
    };

    await addQuestion(questionData);
    closeAddModal();
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddMode('manual');
    setPasteText('');
    setNewQuestion({
      enunciado: '',
      disciplina: '',
      topico: '',
      dificuldade: 'media',
      respostaCorreta: 'A',
      alternativas: [
        { letra: 'A', texto: '' },
        { letra: 'B', texto: '' },
        { letra: 'C', texto: '' },
        { letra: 'D', texto: '' },
        { letra: 'E', texto: '' }
      ],
      explicacao: '',
      fonte: ''
    });
  };

  const processPasteWithAI = async () => {
    if (!pasteText.trim()) return;
    
    const apiKey = config?.geminiKey;
    if (!apiKey) {
      alert('Configure a API Key do Gemini em Configurações primeiro.');
      return;
    }

    setIsProcessingPaste(true);

    try {
      const prompt = `Analise o texto abaixo e extraia a questão de múltipla escolha. Retorne APENAS um objeto JSON válido no seguinte formato:

{
  "enunciado": "texto completo do enunciado",
  "alternativas": [
    {"letra": "A", "texto": "texto da alternativa A"},
    {"letra": "B", "texto": "texto da alternativa B"},
    {"letra": "C", "texto": "texto da alternativa C"},
    {"letra": "D", "texto": "texto da alternativa D"},
    {"letra": "E", "texto": "texto da alternativa E"}
  ],
  "respostaCorreta": "letra da alternativa correta (A, B, C, D ou E)",
  "disciplina": "disciplina da questão",
  "topico": "tópico específico",
  "dificuldade": "facil|media|dificil",
  "explicacao": "explicação da resposta"
}

Texto para analisar:
${pasteText}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      });

      if (!response.ok) throw new Error('Erro na API Gemini');

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        setNewQuestion({
          enunciado: parsed.enunciado || '',
          disciplina: parsed.disciplina || '',
          topico: parsed.topico || '',
          dificuldade: parsed.dificuldade || 'media',
          respostaCorreta: parsed.respostaCorreta || 'A',
          alternativas: parsed.alternativas || [
            { letra: 'A', texto: '' },
            { letra: 'B', texto: '' },
            { letra: 'C', texto: '' },
            { letra: 'D', texto: '' },
            { letra: 'E', texto: '' }
          ],
          explicacao: parsed.explicacao || '',
          fonte: ''
        });
        
        setAddMode('manual'); // Muda para modo manual mostrando os dados preenchidos
      }
    } catch (err) {
      console.error('Erro ao processar:', err);
      alert('Erro ao processar texto. Tente novamente ou preencha manualmente.');
    } finally {
      setIsProcessingPaste(false);
    }
  };

  const updateAlternativa = (letra, texto) => {
    setNewQuestion(prev => ({
      ...prev,
      alternativas: prev.alternativas.map(alt => 
        alt.letra === letra ? { ...alt, texto } : alt
      )
    }));
  };

  return (
    <div id="view-banco" className="view active">
      {/* Abas de Disciplinas */}
      <div className="disciplina-tabs" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--brd)',
        overflowX: 'auto',
        flexWrap: 'nowrap'
      }}>
        <button
          className={`disciplina-tab ${activeDisciplina === '' ? 'active' : ''}`}
          onClick={() => handleDisciplinaChange('')}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeDisciplina === '' ? 'var(--pri)' : 'var(--surf2)',
            color: activeDisciplina === '' ? '#000' : 'var(--txt)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          📚 Todas ({questionsList.length})
        </button>
        {disciplinas.map(disc => (
          <button
            key={disc}
            className={`disciplina-tab ${activeDisciplina === disc ? 'active' : ''}`}
            onClick={() => handleDisciplinaChange(disc)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeDisciplina === disc ? 'var(--pri)' : 'var(--surf2)',
              color: activeDisciplina === disc ? '#000' : 'var(--txt)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {disc} ({disciplinaCounts[disc] || 0})
          </button>
        ))}
      </div>

      {/* Botão Adicionar + Filtros */}
      <div className="flex ac jb mb16">
        <div className="filters" style={{ flex: 1 }}>
          <input
            className="f-inp"
            id="f-search"
            placeholder="🔍 Buscar questão..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ flex: 1, marginBottom: 0 }}
          />
        </div>
        <button 
          className="btn btn-pri"
          onClick={() => setShowAddModal(true)}
          style={{ whiteSpace: 'nowrap', marginLeft: '12px' }}
        >
          ➕ Nova Questão
        </button>
      </div>

      {/* Filtros secundários */}
      <div className="filters" style={{ marginBottom: '16px' }}>
        <select
          className="f-sel"
          id="f-top"
          value={filters.topico}
          onChange={(e) => handleFilterChange('topico', e.target.value)}
        >
          <option value="">Todos tópicos</option>
          {topicos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="f-sel"
          id="f-dif"
          value={filters.dificuldade}
          onChange={(e) => handleFilterChange('dificuldade', e.target.value)}
        >
          <option value="">Dificuldade</option>
          <option value="facil">Fácil</option>
          <option value="media">Média</option>
          <option value="dificil">Difícil</option>
        </select>
      </div>
      <div className="flex ac jb mb8">
        <div style={{ color: 'var(--mut)', fontSize: '13px' }}>
          {filteredQuestions.length} questão{filteredQuestions.length !== 1 ? 's' : ''} encontrada{filteredQuestions.length !== 1 ? 's' : ''}
        </div>
        {filteredQuestions.length > 0 && (
          <div className="flex ac gap8">
            <label className="flex ac gap6" style={{ cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                onChange={toggleSelectAll}
              />
              Selecionar todas
            </label>
            {selectedIds.size > 0 && (
              <>
                <span style={{ color: 'var(--mut)', fontSize: '13px' }}>
                  {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Deletar ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div id="banco-list">
        {filteredQuestions.length ? (
          filteredQuestions.map(q => (
            <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`}>
              <div className="q-meta">
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelection(q.id)}
                  style={{ cursor: 'pointer' }}
                />
                {activeDisciplina === '' && <span className="badge bb">{q.disciplina || '—'}</span>}
                {q.topico && <span className="badge bm">{q.topico}</span>}
                <span className={`badge ${q.dificuldade === 'facil' ? 'dif-facil' : q.dificuldade === 'dificil' ? 'dif-dificil' : 'dif-media'}`}>
                  {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'dificil' ? 'Difícil' : 'Média'}
                </span>
                {q.geradoIA && <span className="badge bai">🤖 IA</span>}
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--mut)', fontFamily: 'JetBrains Mono' }}>
                  {q.fonte || ''}
                </span>
              </div>
              <div className="q-text">{q.enunciado || ''}</div>
              <div className="q-actions">
                <button className="btn btn-sec btn-sm">👁 Ver</button>
                <button className="btn btn-ghost btn-sm">✏️ Editar</button>
                <button className="btn btn-ghost btn-sm">📌 Classificar</button>
                <button className="btn btn-danger btn-sm">🗑</button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <span className="empty-ico">🔍</span>
            <div className="empty-ttl">Nenhuma questão encontrada</div>
            <div className="empty-dsc">Ajuste os filtros ou adicione questões via Upload</div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">⚠️ Confirmar Deleção</div>
            <p style={{ marginBottom: '16px' }}>
              Tem certeza que deseja deletar <strong>{selectedIds.size}</strong> questão{selectedIds.size !== 1 ? 's' : ''}?
            </p>
            <p className="note warn" style={{ marginBottom: '16px' }}>
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap8 jc-end">
              <button className="btn btn-sec" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDeleteSelected}>
                🗑️ Sim, deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Questão */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">➕ Cadastrar Nova Questão</div>
            
            {/* Toggle Modo */}
            <div className="flex gap8 mb16">
              <button
                type="button"
                className={`btn ${addMode === 'manual' ? 'btn-pri' : 'btn-sec'}`}
                onClick={() => setAddMode('manual')}
              >
                ✏️ Manual
              </button>
              <button
                type="button"
                className={`btn ${addMode === 'paste' ? 'btn-pri' : 'btn-sec'}`}
                onClick={() => setAddMode('paste')}
              >
                📋 Copiar & Colar (IA)
              </button>
            </div>

            {/* Modo Copiar & Colar */}
            {addMode === 'paste' && (
              <div style={{ marginBottom: '20px' }}>
                <div className="note info mb16">
                  💡 <span>Cole o texto da questão (enunciado + alternativas) e a IA extrairá automaticamente os dados.</span>
                </div>
                
                <div className="fg" style={{ marginBottom: '12px' }}>
                  <label className="flbl">Texto da Questão *</label>
                  <textarea
                    className="fta"
                    rows="10"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Cole aqui o texto da questão...&#10;&#10;Exemplo:&#10;1. Qual é a capital do Brasil?&#10;A) São Paulo&#10;B) Rio de Janeiro&#10;C) Brasília&#10;D) Salvador&#10;E) Belo Horizonte&#10;&#10;Resposta: C"
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-pri"
                  onClick={processPasteWithAI}
                  disabled={isProcessingPaste || !pasteText.trim()}
                  style={{ width: '100%' }}
                >
                  {isProcessingPaste ? '⏳ Processando com IA...' : '🤖 Processar com Gemini'}
                </button>

                {!config?.geminiKey && (
                  <div className="note warn mt12">
                    ⚠️ <span>Configure a API Key do Gemini em <button onClick={() => { closeAddModal(); setView('config'); }} style={{ color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Configurações</button>.</span>
                  </div>
                )}
              </div>
            )}

            {/* Modo Manual */}
            <form onSubmit={handleAddQuestion} style={{ display: addMode === 'manual' ? 'block' : 'none' }}>
              {/* Enunciado */}
              <div className="fg" style={{ marginBottom: '16px' }}>
                <label className="flbl">Enunciado *</label>
                <textarea
                  className="fta"
                  rows="4"
                  value={newQuestion.enunciado}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, enunciado: e.target.value }))}
                  placeholder="Digite o enunciado da questão..."
                  required
                />
              </div>

              {/* Disciplina e Tópico */}
              <div className="flex gap12" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="fg" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="flbl">Disciplina *</label>
                  <input
                    className="finp"
                    type="text"
                    value={newQuestion.disciplina}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, disciplina: e.target.value }))}
                    placeholder="Ex: Matemática"
                    required
                  />
                </div>
                <div className="fg" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="flbl">Tópico</label>
                  <input
                    className="finp"
                    type="text"
                    value={newQuestion.topico}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, topico: e.target.value }))}
                    placeholder="Ex: Álgebra"
                  />
                </div>
              </div>

              {/* Dificuldade e Resposta Correta */}
              <div className="flex gap12" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="fg" style={{ flex: 1, minWidth: '150px' }}>
                  <label className="flbl">Dificuldade</label>
                  <select
                    className="fsel"
                    value={newQuestion.dificuldade}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, dificuldade: e.target.value }))}
                  >
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
                <div className="fg" style={{ flex: 1, minWidth: '150px' }}>
                  <label className="flbl">Resposta Correta *</label>
                  <select
                    className="fsel"
                    value={newQuestion.respostaCorreta}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, respostaCorreta: e.target.value }))}
                    required
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
                <div className="fg" style={{ flex: 2, minWidth: '200px' }}>
                  <label className="flbl">Fonte</label>
                  <input
                    className="finp"
                    type="text"
                    value={newQuestion.fonte}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, fonte: e.target.value }))}
                    placeholder="Ex: Banca XYZ - 2023"
                  />
                </div>
              </div>

              {/* Alternativas */}
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Alternativas *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {newQuestion.alternativas.map((alt) => (
                    <div key={alt.letra} className="flex ac gap8">
                      <span 
                        style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '13px',
                          background: newQuestion.respostaCorreta === alt.letra ? 'var(--pri)' : 'var(--surf2)',
                          color: newQuestion.respostaCorreta === alt.letra ? '#000' : 'var(--txt)'
                        }}
                      >
                        {alt.letra}
                      </span>
                      <input
                        className="finp"
                        type="text"
                        value={alt.texto}
                        onChange={(e) => updateAlternativa(alt.letra, e.target.value)}
                        placeholder={`Alternativa ${alt.letra}`}
                        required={alt.letra === 'A' || alt.letra === 'B'}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicação */}
              <div className="fg" style={{ marginBottom: '20px' }}>
                <label className="flbl">Explicação / Gabarito Comentado</label>
                <textarea
                  className="fta"
                  rows="3"
                  value={newQuestion.explicacao}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, explicacao: e.target.value }))}
                  placeholder="Explique a resposta correta (opcional)..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap12 jc-end">
                <button 
                  type="button" 
                  className="btn btn-sec"
                  onClick={closeAddModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-pri"
                >
                  💾 Salvar Questão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banco;