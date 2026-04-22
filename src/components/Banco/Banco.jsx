import { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, getTopicos, normalizarTopico, normalizarDisciplina } from '../../config/editalConfig';
import { analisarClassificacaoQuestoes, gerarRelatorioClassificacao } from '../../utils/questionDiagnostics';
import { formatarData, tempoDecorrido } from '../../utils/dateUtils';

const Banco = () => {
  const { questions, deleteQuestion, addQuestion, updateQuestion, config, setView } = useStudy();
  const [activeDisciplina, setActiveDisciplina] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    topico: '',
    errosOnly: '',
    origem: '' // '' = todas, 'ia' = geradas por IA, 'manual' = cadastradas manualmente
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showDiagnostico, setShowDiagnostico] = useState(false);
  const [diagnosticoData, setDiagnosticoData] = useState(null);
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  const [showDuplicatas, setShowDuplicatas] = useState(false);
  const [duplicataSelecionada, setDuplicataSelecionada] = useState(null);
  const [duplicatasAceitas, setDuplicatasAceitas] = useState(new Set()); // IDs de questões que o usuário aceitou como duplicadas
  const [duplicataComparacao, setDuplicataComparacao] = useState(null); // Duplicata sendo comparada lado a lado
  const [showVarredura, setShowVarredura] = useState(false);
  const [varreduraData, setVarreduraData] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    enunciado: '',
    disciplina: '',
    topico: '',
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

  const questionsList = useMemo(() => Object.values(questions || {}), [questions]);

  // Questões filtradas por disciplina ativa e filtros adicionais
  const filteredQuestions = useMemo(() => {
    let filtered = questionsList;

    // Filtrar por disciplina ativa (se houver)
    if (activeDisciplina) {
      filtered = filtered.filter(q => normalizarDisciplina(q.disciplina) === activeDisciplina);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(q =>
        (q.enunciado || '').toLowerCase().includes(search) ||
        (q.topico || '').toLowerCase().includes(search)
      );
    }

    if (filters.topico) {
      filtered = filtered.filter(q => normalizarTopico(q.topico) === filters.topico);
    }

    // Filtro por origem (IA vs Manual)
    if (filters.origem === 'ia') {
      filtered = filtered.filter(q => q.geradoIA === true);
    } else if (filters.origem === 'manual') {
      filtered = filtered.filter(q => !q.geradoIA);
    }

    return filtered;
  }, [questionsList, activeDisciplina, filters]);

  // Disciplinas na ordem oficial do edital (todas, mesmo sem questões)
  const disciplinas = useMemo(() => {
    return DISCIPLINAS;
  }, []);

  // Contagem de questões por disciplina (normalizadas)
  const disciplinaCounts = useMemo(() => {
    const counts = {};
    questionsList.forEach(q => {
      const disc = normalizarDisciplina(q.disciplina) || 'Sem disciplina';
      counts[disc] = (counts[disc] || 0) + 1;
    });
    return counts;
  }, [questionsList]);

  // Contagem de questões por origem
  const questoesIA = useMemo(() => questionsList.filter(q => q.geradoIA).length, [questionsList]);
  const questoesManual = useMemo(() => questionsList.filter(q => !q.geradoIA).length, [questionsList]);

  // Tópicos na ordem oficial do edital (todos, mesmo sem questões na disciplina ativa)
  const topicos = useMemo(() => {
    // Se tem disciplina ativa, retorna todos os tópicos oficiais
    if (activeDisciplina) {
      return getTopicos(activeDisciplina);
    }
    // Se não tem disciplina, retorna todos os tópicos de todas as disciplinas
    return DISCIPLINAS.flatMap(d => getTopicos(d));
  }, [activeDisciplina]);

  // Contagem de questões por tópico
  const topicosCounts = useMemo(() => {
    const counts = {};
    const discFiltered = activeDisciplina
      ? questionsList.filter(q => normalizarDisciplina(q.disciplina) === activeDisciplina)
      : questionsList;
    discFiltered.forEach(q => {
      const topico = normalizarTopico(q.topico);
      if (topico) {
        counts[topico] = (counts[topico] || 0) + 1;
      }
    });
    return counts;
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

  const confirmDeleteQuestion = (id) => {
    setDeletingQuestionId(id);
  };

  const handleDeleteSingle = async () => {
    if (deletingQuestionId) {
      await deleteQuestion(deletingQuestionId);
      setDeletingQuestionId(null);
    }
  };

  const cancelDeleteSingle = () => {
    setDeletingQuestionId(null);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    
    const agora = new Date();
    const questionData = {
      id: `q_${Date.now()}`,
      ...newQuestion,
      geradoIA: addMode === 'paste',
      createdAt: agora.toISOString(),
      updatedAt: agora.toISOString(),
      historico: [
        {
          tipo: addMode === 'paste' ? 'importacao' : 'criacao',
          dataISO: agora.toISOString(),
          dataFormatada: formatarData(agora),
          ano: agora.getFullYear(),
          mes: agora.getMonth() + 1,
          dia: agora.getDate(),
          hora: agora.getHours(),
          minuto: agora.getMinutes(),
          detalhes: addMode === 'paste' ? 'Importada via colagem' : 'Criada manualmente'
        }
      ]
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

  const openEditModal = (question) => {
    setEditingQuestion({ ...question });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingQuestion(null);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, editingQuestion);
      closeEditModal();
    }
  };

  const updateEditingAlternativa = (letra, texto) => {
    setEditingQuestion(prev => ({
      ...prev,
      alternativas: prev.alternativas.map(alt => 
        alt.letra === letra ? { ...alt, texto } : alt
      )
    }));
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
      ),
    }));
    // Verificar se a questão atual tem duplicata
    if (questaoTemDuplicata(newQuestion.id)) {
      console.log("Questão tem duplicata!");
      // Aqui você pode adicionar a lógica para lidar com a duplicata
    }
  };

  // Função para calcular similaridade entre dois textos (simples)
  const calcularSimilaridade = (texto1, texto2) => {
    if (!texto1 || !texto2) return 0;
    const t1 = texto1.toLowerCase().trim();
    const t2 = texto2.toLowerCase().trim();
    
    // Se são idênticos
    if (t1 === t2) return 1;
    
    // Se um contém o outro completamente
    if (t1.includes(t2) || t2.includes(t1)) return 0.9;
    
    // Calcula similaridade por palavras comuns
    const palavras1 = t1.split(/\s+/).filter(p => p.length > 3);
    const palavras2 = t2.split(/\s+/).filter(p => p.length > 3);
    
    if (palavras1.length === 0 || palavras2.length === 0) return 0;
    
    const comuns = palavras1.filter(p => palavras2.includes(p));
    const similaridade = (2 * comuns.length) / (palavras1.length + palavras2.length);
    
    return similaridade;
  };

  // Detectar duplicatas nas questões
  const duplicatas = useMemo(() => {
    const listaDuplicatas = [];
    const threshold = 0.7; // 70% de similaridade
    
    for (let i = 0; i < questionsList.length; i++) {
      for (let j = i + 1; j < questionsList.length; j++) {
        const q1 = questionsList[i];
        const q2 = questionsList[j];
        
        // Só compara mesma disciplina
        if (normalizarDisciplina(q1.disciplina) !== normalizarDisciplina(q2.disciplina)) continue;
        
        const similaridade = calcularSimilaridade(q1.enunciado, q2.enunciado);
        
        if (similaridade >= threshold) {
          listaDuplicatas.push({
            q1,
            q2,
            similaridade: Math.round(similaridade * 100)
          });
        }
      }
    }
    
    return listaDuplicatas;
  }, [questionsList]);

  // Verificar se uma questão específica tem duplicata
  const questaoTemDuplicata = (questaoId) => {
    return duplicatas.some(d => d.q1.id === questaoId || d.q2.id === questaoId);
  };

  // Função para executar diagnóstico de classificação
  const executarDiagnostico = () => {
    const stats = analisarClassificacaoQuestoes(questions);
    setDiagnosticoData(stats);
    setShowDiagnostico(true);
    console.log('%c📊 DIAGNÓSTICO DE CLASSIFICAÇÃO', 'font-size: 16px; font-weight: bold; color: #4a90d9;');
    console.log(gerarRelatorioClassificacao(stats));
  };

  // Função para varredura/relatório completo do banco
  const varreduraQuestoes = () => {
    const total = questionsList.length;
    const porDisciplina = {};
    const porTopico = {};
    const porOrigem = { ia: 0, manual: 0 };
    const semClassificacao = [];

    questionsList.forEach(q => {
      const disc = normalizarDisciplina(q.disciplina) || 'Sem disciplina';
      const top = normalizarTopico(q.topico) || 'Sem tópico';
      
      // Contar por disciplina
      porDisciplina[disc] = (porDisciplina[disc] || 0) + 1;

      // Contar por tópico
      if (!porTopico[disc]) porTopico[disc] = {};
      porTopico[disc][top] = (porTopico[disc][top] || 0) + 1;

      // Contar por origem
      if (q.geradoIA) porOrigem.ia++;
      else porOrigem.manual++;

      // Verificar sem classificação
      if (!q.disciplina || q.disciplina === 'Geral' || !q.topico) {
        semClassificacao.push(q);
      }
    });

    const relatorio = {
      total,
      porDisciplina,
      porTopico,
      porOrigem,
      semClassificacao: semClassificacao.length,
      questoesSemClassificacao: semClassificacao,
      disciplinasTotal: Object.keys(porDisciplina).length,
      topicosTotal: Object.values(porTopico).reduce((acc, topicos) => acc + Object.keys(topicos).length, 0)
    };

    setVarreduraData(relatorio);
    setShowVarredura(true);
  };

  // Aceitar uma duplicata (marcar que o usuário aceitou manter ambas)
  const aceitarDuplicata = (q1Id, q2Id) => {
    setDuplicatasAceitas(prev => {
      const novoSet = new Set(prev);
      novoSet.add(`${q1Id}_${q2Id}`);
      novoSet.add(`${q2Id}_${q1Id}`); // Adiciona ambas as direções
      return novoSet;
    });
  };

  // Verificar se uma duplicata já foi aceita
  const duplicataFoiAceita = (q1Id, q2Id) => {
    return duplicatasAceitas.has(`${q1Id}_${q2Id}`) || duplicatasAceitas.has(`${q2Id}_${q1Id}`);
  };

  // Determinar origem da questão (Gemini, Parser ou Manual)
  const getOrigemQuestao = (q) => {
    if (q.geradoIA) {
      return { tipo: 'gemini', label: '🤖 Gemini', cor: 'var(--warn)' };
    }
    if (q._metodo === 'parser-local') {
      return { tipo: 'parser', label: '📄 Parser', cor: '#60a5fa' };
    }
    return { tipo: 'manual', label: '✏️ Manual', cor: '#4ade80' };
  };

  // Stats para o header
  const stats = useMemo(() => {
    const total = questionsList.length;
    const porDisciplina = {};
    questionsList.forEach(q => {
      const d = normalizarDisciplina(q.disciplina) || 'Sem disciplina';
      porDisciplina[d] = (porDisciplina[d] || 0) + 1;
    });
    return { total, porDisciplina, disciplinasCount: Object.keys(porDisciplina).length };
  }, [questionsList]);

  return (
    <div id="view-banco" className="view active" style={{
      width: '100%',
      height: '100%',
      padding: '0 24px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Header Moderno - Layout reorganizado */}
      <div style={{ marginBottom: '20px' }}>
        {/* Linha 1: Título + Botões de ação */}
        <div className="flex ac jb" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              margin: '0 0 4px 0'
            }}>
              Banco de Questões
            </h1>
            <p style={{ margin: 0, color: 'var(--mut)', fontSize: '13px' }}>
              {stats.total} questões em {stats.disciplinasCount} disciplinas
              {duplicatas.length > 0 && (
                <span style={{ color: 'var(--warn)', marginLeft: '12px', fontWeight: 600 }}>
                  ⚠️ {duplicatas.length} possíveis duplicatas
                </span>
              )}
            </p>
          </div>
          <div className="flex ac" style={{ gap: '10px' }}>
            {duplicatas.length > 0 && (
              <button
                className="btn btn-warn"
                onClick={() => setShowDuplicatas(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '10px'
                }}
              >
                <span>⚠️</span>
                Ver Duplicatas
              </button>
            )}
            <button
              className="btn btn-sec"
              onClick={varreduraQuestoes}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              <span>📊</span>
              Varredura
            </button>
            <button
              className="btn btn-pri"
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              <span>➕</span>
              Nova Questão
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros (esquerda) + Abas de origem (direita) */}
        <div className="flex ac jb" style={{ 
          padding: '12px 16px',
          background: 'var(--surf1)',
          borderRadius: '12px',
          border: '1px solid var(--brd)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Filtros à esquerda */}
          <div className="flex ac" style={{ gap: '10px', flexWrap: 'wrap' }}>
            {/* Busca */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <span style={{ 
                position: 'absolute',  
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                fontSize: '13px'
              }}>🔍</span>
              <input
                className="f-inp"
                placeholder="Buscar por enunciado, tópico..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ 
                  paddingLeft: '32px', 
                  marginBottom: 0,
                  borderRadius: '8px',
                  fontSize: '13px',
                  height: '38px'
                }}
              />
            </div>
            
            {/* Disciplina */}
            <select
              className="f-sel"
              value={activeDisciplina}
              onChange={(e) => handleDisciplinaChange(e.target.value)}
              style={{ 
                marginBottom: 0, 
                minWidth: '160px',
                borderRadius: '8px',
                fontSize: '13px',
                height: '38px'
              }}
            >
              <option value="">📚 Todas as disciplinas</option>
              {disciplinas.map(d => (
                <option key={d} value={d}>
                  {d} ({disciplinaCounts[d] || 0})
                </option>
              ))}
            </select>

            {/* Tópico */}
            <select
              className="f-sel"
              value={filters.topico}
              onChange={(e) => handleFilterChange('topico', e.target.value)}
              style={{ 
                marginBottom: 0, 
                minWidth: '150px',
                borderRadius: '8px',
                fontSize: '13px',
                height: '38px'
              }}
            >
              <option value="">🏷️ Todos os tópicos</option>
              {topicos.map(t => (
                <option key={t} value={t}>
                  {t} ({topicosCounts[t] || 0})
                </option>
              ))}
            </select>
            
            {/* Limpar filtros */}
            {(activeDisciplina || filters.topico || filters.search) && (
              <button
                onClick={() => {
                  setActiveDisciplina('');
                  setFilters({ search: '', topico: '', errosOnly: '', origem: filters.origem });
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--acc)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 4px'
                }}
              >
                ✕ Limpar
              </button>
            )}
          </div>

          {/* Abas de Origem à direita */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg)', 
            borderRadius: '8px', 
            padding: '3px',
            border: '1px solid var(--brd)'
          }}>
            <button
              onClick={() => handleFilterChange('origem', '')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filters.origem === '' ? 'var(--pri)' : 'transparent',
                color: filters.origem === '' ? '#000' : 'var(--txt)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📚 Todas ({stats.total})
            </button>
            <button
              onClick={() => handleFilterChange('origem', 'manual')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filters.origem === 'manual' ? 'var(--acc)' : 'transparent',
                color: filters.origem === 'manual' ? '#fff' : 'var(--txt)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ✏️ Manual ({questoesManual})
            </button>
            <button
              onClick={() => handleFilterChange('origem', 'ia')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filters.origem === 'ia' ? 'var(--warn)' : 'transparent',
                color: filters.origem === 'ia' ? '#000' : 'var(--txt)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🤖 IA ({questoesIA})
            </button>
          </div>
        </div>

        {/* Linha 3: Seleção em massa e ações */}
        <div className="flex ac jb" style={{
          marginTop: '12px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>

          {/* Seleção em massa - Checkbox moderno */}
          {filteredQuestions.length > 0 && (
            <div className="flex ac" style={{ gap: '12px' }}>
              <label 
                className="flex ac"
                onClick={toggleSelectAll}
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  gap: '10px',
                  color: selectedIds.size > 0 ? 'var(--pri)' : 'var(--mut)',
                  fontWeight: selectedIds.size > 0 ? 600 : 500,
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: selectedIds.size > 0 ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                  border: `1px solid ${selectedIds.size > 0 ? 'var(--pri)' : 'var(--brd)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: `2px solid ${selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? 'var(--pri)' : 'var(--brd)'}`,
                  background: selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? 'var(--pri)' : selectedIds.size > 0 ? 'rgba(74, 222, 128, 0.3)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  {(selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) && (
                    <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                  )}
                  {selectedIds.size > 0 && selectedIds.size < filteredQuestions.length && (
                    <span style={{ color: 'var(--pri)', fontSize: '10px', fontWeight: 'bold' }}>−</span>
                  )}
                </div>
                {selectedIds.size > 0 ? `${selectedIds.size} selecionadas` : `Selecionar ${filteredQuestions.length}`}
              </label>
              {selectedIds.size > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '11px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>🗑️</span>
                  Deletar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Área scrollável - Lista de questões em grid 2 colunas */}
      <div id="banco-list" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        alignContent: 'start',
        flex: 1,
        overflowY: 'scroll',
        overflowX: 'hidden',
        paddingRight: '8px',
        paddingLeft: '4px'
      }}>
        {filteredQuestions.length ? (
          filteredQuestions.map(q => (
            <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`} style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '180px'
            }}>
              <div className="q-meta" style={{ flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelection(q.id)}
                  style={{ cursor: 'pointer' }}
                />
                {activeDisciplina === '' && <span className="badge bb">{normalizarDisciplina(q.disciplina) || '—'}</span>}
                {q.topico && <span className="badge bm">{normalizarTopico(q.topico)}</span>}
                {/* Badge de origem da questão */}
                {(() => {
                  const origem = getOrigemQuestao(q);
                  return (
                    <span 
                      className="badge" 
                      style={{ 
                        background: origem.cor, 
                        color: origem.tipo === 'gemini' ? '#000' : '#fff',
                        fontSize: '10px',
                        fontWeight: 600
                      }}
                      title={`Origem: ${origem.tipo}`}
                    >
                      {origem.label}
                    </span>
                  );
                })()}
                {/* Badge de duplicata aceita */}
                {duplicatas.some(d => 
                  (d.q1.id === q.id || d.q2.id === q.id) && duplicataFoiAceita(d.q1.id, d.q2.id)
                ) && (
                  <span 
                    className="badge" 
                    style={{ background: 'var(--pri)', color: '#000', fontSize: '10px' }}
                    title="Esta questão foi aceita como duplicata"
                  >
                    ✅ Duplicata Aceita
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--mut)', fontFamily: 'JetBrains Mono' }}>
                  {q.fonte || ''}
                </span>
                {/* Data de criação */}
                <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--mut)' }} title={formatarData(q.createdAt)}>
                  📅 {tempoDecorrido(q.createdAt)}
                </span>
              </div>
              <div className="q-text" style={{
                flex: 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>{q.enunciado || ''}</div>
              <div className="q-actions" style={{ flexShrink: 0, marginTop: 'auto' }}>
                <button className="btn btn-sec btn-sm" onClick={() => openEditModal(q)}>✏️ Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteQuestion(q.id)}>🗑️ Deletar</button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
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

      {/* Modal Confirmar Deleção Individual */}
      {deletingQuestionId && (
        <div className="modal-overlay" onClick={cancelDeleteSingle}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">⚠️ Confirmar Deleção</div>
            <p style={{ marginBottom: '16px' }}>
              Tem certeza que deseja deletar esta questão?
            </p>
            <p className="note warn" style={{ marginBottom: '16px' }}>
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap8 jc-end">
              <button className="btn btn-sec" onClick={cancelDeleteSingle}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDeleteSingle}>
                🗑️ Sim, deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Duplicatas */}
      {showDuplicatas && (
        <div className="modal-overlay" onClick={() => setShowDuplicatas(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">⚠️ Possíveis Duplicatas Detectadas</div>
            <p style={{ marginBottom: '16px', color: 'var(--mut)' }}>
              Encontramos {duplicatas.filter(d => !duplicataFoiAceita(d.q1.id, d.q2.id)).length} pares pendentes de revisão (≥70% de similaridade):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {duplicatas.map((dup, index) => {
                const foiAceita = duplicataFoiAceita(dup.q1.id, dup.q2.id);
                return (
                  <div 
                    key={index} 
                    style={{ 
                      border: foiAceita ? '2px solid var(--pri)' : '1px solid var(--brd)', 
                      borderRadius: '8px', 
                      padding: '12px',
                      background: foiAceita ? 'rgba(74, 222, 128, 0.1)' : 'var(--surf)',
                      opacity: foiAceita ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge bb">{normalizarDisciplina(dup.q1.disciplina)}</span>
                        {foiAceita && (
                          <span className="badge" style={{ background: 'var(--pri)', color: '#000', fontSize: '11px' }}>
                            ✅ ACEITO - Manter duplicata
                          </span>
                        )}
                      </div>
                      <span style={{ color: foiAceita ? 'var(--pri)' : 'var(--warn)', fontWeight: 600, fontSize: '12px' }}>
                        {dup.similaridade}% similar
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px' }}>
                      <strong>Questão 1:</strong> {(dup.q1.enunciado || '').substring(0, 80)}...
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                      <strong>Questão 2:</strong> {(dup.q2.enunciado || '').substring(0, 80)}...
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-sec btn-sm" 
                        onClick={() => openEditModal(dup.q1)}
                      >
                        ✏️ Editar 1ª
                      </button>
                      <button 
                        className="btn btn-sec btn-sm" 
                        onClick={() => openEditModal(dup.q2)}
                      >
                        ✏️ Editar 2ª
                      </button>
                      <button 
                        className="btn btn-info btn-sm" 
                        onClick={() => setDuplicataComparacao(dup)}
                        style={{ background: 'var(--acc)', color: '#fff' }}
                      >
                        🔍 Comparar
                      </button>
                      {!foiAceita ? (
                        <>
                          <button 
                            className="btn btn-pri btn-sm" 
                            onClick={() => aceitarDuplicata(dup.q1.id, dup.q2.id)}
                            style={{ background: 'var(--pri)', color: '#000' }}
                          >
                            ✅ Manter
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => { deleteQuestion(dup.q2.id); setShowDuplicatas(false); }}
                          >
                            🗑️ Deletar 2ª
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn btn-sec btn-sm" 
                          onClick={() => {
                            setDuplicatasAceitas(prev => {
                              const novoSet = new Set(prev);
                              novoSet.delete(`${dup.q1.id}_${dup.q2.id}`);
                              novoSet.delete(`${dup.q2.id}_${dup.q1.id}`);
                              return novoSet;
                            });
                          }}
                        >
                          ↩️ Desfazer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap8 jc-end">
              <button className="btn btn-sec" onClick={() => setShowDuplicatas(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Varredura */}
      {showVarredura && varreduraData && (
        <div className="modal-overlay" onClick={() => setShowVarredura(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">📊 Varredura do Banco</div>
            
            {/* Resumo Geral */}
            <div style={{ 
              background: 'var(--surf)', 
              borderRadius: '10px', 
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--brd)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📈 Resumo Geral</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--pri)' }}>{varreduraData.total}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Total de Questões</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--acc)' }}>{varreduraData.disciplinasTotal}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Disciplinas</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warn)' }}>{varreduraData.topicosTotal}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Tópicos</div>
                </div>
              </div>
            </div>

            {/* Por Origem */}
            <div style={{ 
              background: 'var(--surf)', 
              borderRadius: '10px', 
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--brd)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📊 Por Origem</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{varreduraData.porOrigem.manual}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>✏️ Manual</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(250, 204, 21, 0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warn)' }}>{varreduraData.porOrigem.ia}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>🤖 IA</div>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {varreduraData.semClassificacao > 0 && (
              <div style={{ 
                background: 'rgba(248, 113, 113, 0.1)', 
                borderRadius: '10px', 
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid rgba(248, 113, 113, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#f87171' }}>⚠️ Problemas Detectados</h3>
                  <span style={{ 
                    background: '#f87171', 
                    color: '#fff', 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>
                    {varreduraData.semClassificacao}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--mut)' }}>
                  Questões sem classificação completa:
                </p>
                
                {/* Lista de questões com problemas */}
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  border: '1px solid rgba(248, 113, 113, 0.2)', 
                  borderRadius: '6px',
                  background: 'var(--surf)'
                }}>
                  {varreduraData.questoesSemClassificacao?.map((q, index) => (
                    <div 
                      key={q.id}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderBottom: index < (varreduraData.questoesSemClassificacao?.length || 0) - 1 ? '1px solid var(--brd)' : 'none',
                        gap: '8px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          margin: '0 0 4px 0', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          color: 'var(--txt)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          #{index + 1}: {q.disciplina || '❌ Sem disciplina'} {q.topico || '❌ Sem tópico'}
                        </p>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '11px', 
                          color: 'var(--mut)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {q.enunciado?.substring(0, 60) || '...'}...
                        </p>
                      </div>
                      <button 
                        className="btn btn-sec btn-sm"
                        onClick={() => {
                          setShowVarredura(false);
                          openEditModal(q);
                        }}
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '11px',
                          flexShrink: 0
                        }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  ))}
                </div>
                
                <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: 'var(--mut)' }}>
                  💡 Clique em "Editar" para corrigir a classificação da questão
                </p>
              </div>
            )}

            {/* Por Disciplina */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📚 Por Disciplina</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {Object.entries(varreduraData.porDisciplina)
                  .sort(([,a], [,b]) => b - a)
                  .map(([disc, count]) => (
                    <div 
                      key={disc} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--brd)',
                        background: 'var(--surf)',
                        borderRadius: '6px',
                        marginBottom: '6px'
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{disc}</span>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--pri)' }}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap8 jc-end">
              <button className="btn btn-sec" onClick={() => setShowVarredura(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Diagnóstico de Classificação */}
      {showDiagnostico && diagnosticoData && (
        <div className="modal-overlay" onClick={() => setShowDiagnostico(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">📊 Diagnóstico de Classificação</div>
            <div style={{ padding: '20px' }}>
              {diagnosticoData.erro ? (
                <div style={{ color: 'var(--err)', textAlign: 'center', padding: '20px' }}>
                  {diagnosticoData.erro}
                </div>
              ) : (
                <>
                  {/* Resumo */}
                  <div style={{ 
                    background: 'var(--surf)', 
                    borderRadius: '10px', 
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid var(--brd)'
                  }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📈 Resumo Geral</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div>
                        <strong>Total de questões:</strong> {diagnosticoData.total}
                      </div>
                      <div style={{ color: diagnosticoData.semDisciplina > 0 ? 'var(--warn)' : 'var(--pri)' }}>
                        <strong>Sem disciplina:</strong> {diagnosticoData.semDisciplina} ({((diagnosticoData.semDisciplina/diagnosticoData.total)*100).toFixed(1)}%)
                      </div>
                      <div style={{ color: diagnosticoData.semTopico > 0 ? 'var(--warn)' : 'var(--pri)' }}>
                        <strong>Sem tópico:</strong> {diagnosticoData.semTopico} ({((diagnosticoData.semTopico/diagnosticoData.total)*100).toFixed(1)}%)
                      </div>
                      <div style={{ color: diagnosticoData.disciplinaInvalida > 0 ? 'var(--warn)' : 'var(--pri)' }}>
                        <strong>Disciplina inválida:</strong> {diagnosticoData.disciplinaInvalida} ({((diagnosticoData.disciplinaInvalida/diagnosticoData.total)*100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Disciplinas */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>📚 Questões por Disciplina</h3>
                    {Object.entries(diagnosticoData.porDisciplina || {})
                      .sort((a, b) => b[1].count - a[1].count)
                      .filter(([_, data]) => data.count > 0)
                      .map(([disc, data]) => (
                        <div key={disc} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--brd)'
                        }}>
                          <span>{disc}</span>
                          <span style={{ fontWeight: 600 }}>{data.count}</span>
                        </div>
                      ))}
                  </div>

                  {/* Questões problemáticas */}
                  {diagnosticoData.questoesProblematicas?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--warn)' }}>🔍 Questões Sem Classificação (Amostra)</h3>
                      {diagnosticoData.questoesProblematicas.slice(0, 5).map((q, i) => (
                        <div key={i} style={{ 
                          padding: '8px', 
                          marginBottom: '8px',
                          background: 'rgba(255, 193, 7, 0.1)',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--warn)'
                        }}>
                          <div style={{ fontSize: '12px', color: 'var(--mut)' }}>ID: {q.id}</div>
                          <div style={{ fontSize: '13px', marginTop: '4px' }}>{q.enunciado}</div>
                          <div style={{ fontSize: '12px', color: 'var(--warn)', marginTop: '4px' }}>
                            Problema: {q.problema}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap8 jc-end" style={{ padding: '0 20px 20px' }}>
              <button className="btn btn-sec" onClick={() => setShowDiagnostico(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparação Lado a Lado */}
      {duplicataComparacao && (
        <div className="modal-overlay" onClick={() => setDuplicataComparacao(null)}>
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '95vw', 
              width: '1200px',
              maxHeight: '90vh', 
              overflowY: 'auto'
            }}
          >
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔍 Comparação Lado a Lado</span>
              <span style={{ fontSize: '14px', color: 'var(--warn)' }}>
                {duplicataComparacao.similaridade}% similar
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Questão 1 */}
              <div style={{ 
                border: '2px solid var(--pri)', 
                borderRadius: '12px', 
                padding: '16px',
                background: 'var(--surf)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--brd)'
                }}>
                  <span className="badge" style={{ background: 'var(--pri)', color: '#000' }}>
                    Questão 1
                  </span>
                  <span className="badge bb">{normalizarDisciplina(duplicataComparacao.q1.disciplina)}</span>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>Enunciado</label>
                  <div style={{ 
                    background: 'var(--bg)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {duplicataComparacao.q1.enunciado || 'Sem enunciado'}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>Alternativas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {duplicataComparacao.q1.alternativas?.map((alt) => (
                      <div 
                        key={alt.letra} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: duplicataComparacao.q1.respostaCorreta === alt.letra ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg)',
                          border: duplicataComparacao.q1.respostaCorreta === alt.letra ? '1px solid var(--pri)' : '1px solid transparent'
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                        <span>{alt.texto || '—'}</span>
                        {duplicataComparacao.q1.respostaCorreta === alt.letra && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--pri)' }}>✓ Correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--mut)' }}>
                  {duplicataComparacao.q1.topico && (
                    <span>🏷️ {normalizarTopico(duplicataComparacao.q1.topico)}</span>
                  )}
                </div>
              </div>

              {/* Questão 2 */}
              <div style={{ 
                border: '2px solid var(--warn)', 
                borderRadius: '12px', 
                padding: '16px',
                background: 'var(--surf)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--brd)'
                }}>
                  <span className="badge" style={{ background: 'var(--warn)', color: '#000' }}>
                    Questão 2
                  </span>
                  <span className="badge bb">{normalizarDisciplina(duplicataComparacao.q2.disciplina)}</span>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>Enunciado</label>
                  <div style={{ 
                    background: 'var(--bg)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {duplicataComparacao.q2.enunciado || 'Sem enunciado'}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>Alternativas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {duplicataComparacao.q2.alternativas?.map((alt) => (
                      <div 
                        key={alt.letra} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: duplicataComparacao.q2.respostaCorreta === alt.letra ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg)',
                          border: duplicataComparacao.q2.respostaCorreta === alt.letra ? '1px solid var(--pri)' : '1px solid transparent'
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                        <span>{alt.texto || '—'}</span>
                        {duplicataComparacao.q2.respostaCorreta === alt.letra && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--pri)' }}>✓ Correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--mut)' }}>
                  {duplicataComparacao.q2.topico && (
                    <span>🏷️ {normalizarTopico(duplicataComparacao.q2.topico)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              paddingTop: '16px',
              borderTop: '1px solid var(--brd)'
            }}>
              <button 
                className="btn btn-sec" 
                onClick={() => setDuplicataComparacao(null)}
              >
                ✕ Fechar Comparação
              </button>
              <button 
                className="btn btn-pri"
                onClick={() => {
                  aceitarDuplicata(duplicataComparacao.q1.id, duplicataComparacao.q2.id);
                  setDuplicataComparacao(null);
                }}
              >
                ✅ Manter Ambas (Aceitar Duplicata)
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  deleteQuestion(duplicataComparacao.q2.id);
                  setDuplicataComparacao(null);
                }}
              >
                🗑️ Deletar Questão 2
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
                  <select
                    className="fsel"
                    value={newQuestion.disciplina}
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      disciplina: e.target.value,
                      topico: '' // Reset tópico ao mudar disciplina
                    }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {DISCIPLINAS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="fg" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="flbl">Tópico</label>
                  <select
                    className="fsel"
                    value={newQuestion.topico}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, topico: e.target.value }))}
                    disabled={!newQuestion.disciplina}
                  >
                    <option value="">
                      {newQuestion.disciplina ? 'Selecione...' : 'Escolha a disciplina primeiro'}
                    </option>
                    {getTopicos(newQuestion.disciplina).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resposta Correta e Fonte */}
              <div className="flex gap12" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
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

      {/* Modal Editar Questão */}
      {showEditModal && editingQuestion && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">✏️ Editar Questão</div>
            
            <form onSubmit={handleUpdateQuestion}>
              {/* Enunciado */}
              <div className="fg" style={{ marginBottom: '16px' }}>
                <label className="flbl">Enunciado *</label>
                <textarea
                  className="fta"
                  rows="4"
                  value={editingQuestion.enunciado}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, enunciado: e.target.value }))}
                  placeholder="Digite o enunciado da questão..."
                  required
                />
              </div>

              {/* Disciplina e Tópico */}
              <div className="flex gap12" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="fg" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="flbl">Disciplina *</label>
                  <select
                    className="fsel"
                    value={editingQuestion.disciplina}
                    onChange={(e) => setEditingQuestion(prev => ({ 
                      ...prev, 
                      disciplina: e.target.value,
                      topico: '' // Reset tópico ao mudar disciplina
                    }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {DISCIPLINAS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="fg" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="flbl">Tópico</label>
                  <select
                    className="fsel"
                    value={editingQuestion.topico}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, topico: e.target.value }))}
                    disabled={!editingQuestion.disciplina}
                  >
                    <option value="">
                      {editingQuestion.disciplina ? 'Selecione...' : 'Escolha a disciplina primeiro'}
                    </option>
                    {getTopicos(editingQuestion.disciplina).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resposta Correta e Fonte */}
              <div className="flex gap12" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="fg" style={{ flex: 1, minWidth: '150px' }}>
                  <label className="flbl">Resposta Correta *</label>
                  <select
                    className="fsel"
                    value={editingQuestion.respostaCorreta}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, respostaCorreta: e.target.value }))}
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
                    value={editingQuestion.fonte}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, fonte: e.target.value }))}
                    placeholder="Ex: Banca XYZ - 2023"
                  />
                </div>
              </div>

              {/* Alternativas */}
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Alternativas *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {editingQuestion.alternativas?.map((alt) => (
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
                          background: editingQuestion.respostaCorreta === alt.letra ? 'var(--pri)' : 'var(--surf2)',
                          color: editingQuestion.respostaCorreta === alt.letra ? '#000' : 'var(--txt)'
                        }}
                      >
                        {alt.letra}
                      </span>
                      <input
                        className="finp"
                        type="text"
                        value={alt.texto}
                        onChange={(e) => updateEditingAlternativa(alt.letra, e.target.value)}
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
                  value={editingQuestion.explicacao}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, explicacao: e.target.value }))}
                  placeholder="Explique a resposta correta (opcional)..."
                />
              </div>

              {/* Histórico da Questão */}
              {editingQuestion.historico && editingQuestion.historico.length > 0 && (
                <div className="fg" style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <label className="flbl" style={{ fontSize: '11px', color: 'var(--mut)', marginBottom: '8px' }}>📅 Histórico</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {editingQuestion.historico.map((h, i) => (
                      <div key={i} style={{ fontSize: '11px', color: 'var(--txt)' }}>
                        <strong style={{ color: h.tipo === 'criacao' ? 'var(--pri)' : 'var(--acc)' }}>
                          {h.tipo === 'criacao' ? '✨ Criada' : h.tipo === 'importacao' ? '📥 Importada' : '✏️ Editada'}
                        </strong>
                        {' '}em {h.dataFormatada || formatarData(h.dataISO)}
                        {h.detalhes && <span style={{ color: 'var(--mut)', marginLeft: '4px' }}>- {h.detalhes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap12 jc-end">
                <button 
                  type="button" 
                  className="btn btn-sec"
                  onClick={closeEditModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-pri"
                >
                  💾 Salvar Alterações
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