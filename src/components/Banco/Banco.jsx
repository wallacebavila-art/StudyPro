import React, { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, MODULOS, getTopicos, normalizarTopico, normalizarDisciplina } from '../../config/editalConfig';
import { analisarClassificacaoQuestoes, gerarRelatorioClassificacao } from '../../utils/questionDiagnostics';
import { formatarData, tempoDecorrido } from '../../utils/dateUtils';

const Banco = () => {
  const { questions, deleteQuestion, addQuestion, updateQuestion, config, setView } = useStudy();
  const [activeDisciplina, setActiveDisciplina] = useState('');
  const [activeModulo, setActiveModulo] = useState(''); // '' = todos, 'Módulo 1', 'Módulo 2'
  const [filters, setFilters] = useState({
    search: '',
    topico: '',
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
  const [showRespostaCorreta, setShowRespostaCorreta] = useState(false);
  const [showExplicacao, setShowExplicacao] = useState(false);
  const [showEnunciado, setShowEnunciado] = useState(true);
  const [showGabarito, setShowGabarito] = useState(false);
  const [viewStyle, setViewStyle] = useState(() => {
    return localStorage.getItem('studypro_viewStyle') || 'grid2';
  });
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

  // Questões filtradas por disciplina ativa, módulo ativo e filtros adicionais
  const filteredQuestions = useMemo(() => {
    let filtered = questionsList;

    // Filtrar por módulo ativo (se houver)
    if (activeModulo && MODULOS[activeModulo]) {
      const disciplinasDoModulo = MODULOS[activeModulo].disciplinas;
      filtered = filtered.filter(q => disciplinasDoModulo.includes(normalizarDisciplina(q.disciplina)));
    }

    // Filtrar por disciplina ativa (se houver) - sobrescreve o filtro de módulo
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
  }, [questionsList, activeDisciplina, activeModulo, filters]);

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

  // Contagem de questões por módulo
  const moduloCounts = useMemo(() => {
    const counts = {};
    Object.entries(MODULOS).forEach(([moduloNome, modulo]) => {
      counts[moduloNome] = modulo.disciplinas.reduce((total, disc) => {
        return total + (disciplinaCounts[disc] || 0);
      }, 0);
    });
    return counts;
  }, [disciplinaCounts]);

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
    if (disciplina) {
      setActiveModulo(''); // Limpa filtro de módulo quando seleciona disciplina específica
    }
    setFilters(prev => ({ ...prev, topico: '' })); // Limpar filtro de tópico
    setSelectedIds(new Set());
  };

  const handleModuloChange = (modulo) => {
    setActiveModulo(modulo);
    if (modulo) {
      setActiveDisciplina(''); // Limpa filtro de disciplina quando seleciona módulo
    }
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

    // Adicionar ID automático [Qxxxx] ao enunciado se não existir
    let enunciadoComId = newQuestion.enunciado;
    if (!extrairIdQuestao(enunciadoComId)) {
      const novoId = gerarIdQuestao();
      enunciadoComId = `[${novoId}] ${enunciadoComId}`;
    }

    const questionData = {
      id: `q_${Date.now()}`,
      ...newQuestion,
      enunciado: enunciadoComId,
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
    setShowRespostaCorreta(false);
    setShowExplicacao(false);
    setShowEnunciado(true);
    setShowGabarito(false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingQuestion(null);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (editingQuestion) {
      // Adicionar ID automático [Qxxxx] ao enunciado se não existir
      let enunciadoComId = editingQuestion.enunciado;
      if (!extrairIdQuestao(enunciadoComId)) {
        const novoId = gerarIdQuestao();
        enunciadoComId = `[${novoId}] ${enunciadoComId}`;
      }

      const questionData = {
        ...editingQuestion,
        enunciado: enunciadoComId,
        updatedAt: new Date().toISOString()
      };

      await updateQuestion(editingQuestion.id, questionData);
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

  // Extrair número de identificação do enunciado (ex: [Q3247383])
  const extrairIdQuestao = (enunciado) => {
    const match = (enunciado || '').match(/\[Q(\d+)\]/);
    return match ? match[1] : null;
  };

  // Gerar novo ID único para questão
  const gerarIdQuestao = () => {
    return `Q${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  // Detectar duplicatas nas questões (por similaridade de texto e por ID)
  const duplicatas = useMemo(() => {
    const listaDuplicatas = [];
    const idMap = new Map(); // Map<questaoId, questao>
    const processados = new Set(); // Evitar duplicatas duplicadas
    let comId = 0;
    let semId = 0;

    // Primeiro: detectar por ID [Qxxxx]
    for (const q of questionsList) {
      const questaoId = extrairIdQuestao(q.enunciado);
      if (questaoId) {
        comId++;
        if (idMap.has(questaoId)) {
          const q1 = idMap.get(questaoId);
          const key = `${q1.id}-${q.id}`;
          if (!processados.has(key)) {
            listaDuplicatas.push({
              q1,
              q2: q,
              questaoId,
              tipo: 'id',
              similaridade: 100
            });
            processados.add(key);
            processados.add(`${q.id}-${q1.id}`);
          }
        } else {
          idMap.set(questaoId, q);
        }
      } else {
        semId++;
      }
    }

    // Segundo: detectar por similaridade de texto (para questões sem ID ou com texto similar)
    const threshold = 0.75; // 75% de similaridade
    for (let i = 0; i < questionsList.length; i++) {
      for (let j = i + 1; j < questionsList.length; j++) {
        const q1 = questionsList[i];
        const q2 = questionsList[j];
        const key = `${q1.id}-${q2.id}`;

        // Pular se já detectado por ID
        if (processados.has(key)) continue;

        // Calcular similaridade apenas no enunciado (primeiros 200 chars)
        const enun1 = (q1.enunciado || '').substring(0, 200);
        const enun2 = (q2.enunciado || '').substring(0, 200);
        const similaridade = calcularSimilaridade(enun1, enun2);

        if (similaridade >= threshold) {
          listaDuplicatas.push({
            q1,
            q2,
            questaoId: null,
            tipo: 'similaridade',
            similaridade: Math.round(similaridade * 100)
          });
          processados.add(key);
          processados.add(`${q2.id}-${q1.id}`);
        }
      }
    }

    console.log(`📊 SCAN DE DUPLICATAS: ${questionsList.length} questões | ${comId} com ID [Qxxxx] | ${semId} sem ID | ${listaDuplicatas.length} duplicatas (${listaDuplicatas.filter(d => d.tipo === 'id').length} por ID, ${listaDuplicatas.filter(d => d.tipo === 'similaridade').length} por similaridade)`);

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

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studypro_theme', theme);
  };

  const handleViewStyleChange = (style) => {
    setViewStyle(style);
    localStorage.setItem('studypro_viewStyle', style);
  };

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
              {duplicatas.length > 0 ? (
                <span style={{ color: 'var(--warn)', marginLeft: '12px', fontWeight: 600 }}>
                  ⚠️ {duplicatas.length} duplicatas detectadas
                </span>
              ) : (
                <span style={{ color: 'var(--pri)', marginLeft: '12px', fontSize: '11px' }}>
                  ✅ Scan ativo (ID + similaridade)
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

            {/* Seletor de estilo de visualização */}
            <select
              value={viewStyle}
              onChange={(e) => handleViewStyleChange(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--brd)',
                background: 'var(--surf)',
                color: 'var(--txt)',
                cursor: 'pointer',
                fontWeight: 500
              }}
              title="Estilo de visualização"
            >
              <option value="grid2">⬜⬜ Grid 2 colunas</option>
              <option value="list">📋 Lista vertical</option>
              <option value="full">⬛ Cards largura total</option>
              <option value="grid3">⬜⬜⬜ Grid 3 colunas</option>
              <option value="compact">📑 Compacto</option>
              <option value="table">📊 Tabela</option>
            </select>
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
            
            {/* Módulo / Disciplina */}
            <select
              className="f-sel"
              value={activeModulo || activeDisciplina}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith('modulo:')) {
                  handleModuloChange(value.replace('modulo:', ''));
                } else {
                  handleDisciplinaChange(value);
                }
              }}
              style={{ 
                marginBottom: 0, 
                minWidth: '220px',
                borderRadius: '8px',
                fontSize: '13px',
                height: '38px'
              }}
            >
              <option value="">📚 Todos os módulos</option>
              {Object.entries(MODULOS).map(([moduloNome, modulo]) => (
                <React.Fragment key={`modulo:${moduloNome}`}>
                  <option 
                    value={`modulo:${moduloNome}`}
                    style={{ fontWeight: 600, background: 'var(--surf2)' }}
                  >
                    📁 {modulo.nome} ({moduloCounts[moduloNome] || 0})
                  </option>
                  {modulo.disciplinas.map(d => (
                    <option key={d} value={d}>
                      └─ {d} ({disciplinaCounts[d] || 0})
                    </option>
                  ))}
                </React.Fragment>
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
            {(activeDisciplina || activeModulo || filters.topico || filters.search) && (
              <button
                onClick={() => {
                  setActiveDisciplina('');
                  setActiveModulo('');
                  setFilters({ search: '', topico: '', origem: filters.origem });
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

      {/* Área scrollável - Lista de questões com estilos variados */}
      <div id="banco-list" style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'scroll',
        overflowX: 'hidden',
        paddingRight: '8px',
        paddingLeft: '4px'
      }}>
        {filteredQuestions.length ? (
          <>
            {/* 1. GRID 2 COLUNAS */}
            {viewStyle === 'grid2' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                alignContent: 'start'
              }}>
                {filteredQuestions.map(q => (
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
                      {duplicatas.some(d => 
                        (d.q1.id === q.id || d.q2.id === q.id) && duplicataFoiAceita(d.q1.id, d.q2.id)
                      ) && (
                        <span 
                          className="badge" 
                          style={{ background: 'var(--pri)', color: '#000', fontSize: '10px' }}
                          title="Esta questão foi aceita como duplicata"
                        >
                          ✅ Duplicata
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--mut)', fontFamily: 'JetBrains Mono' }}>
                        {q.fonte || ''}
                      </span>
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
                      fontSize: '11px',
                      lineHeight: '1.4'
                    }}>{q.enunciado || ''}</div>
                    <div className="q-actions" style={{ flexShrink: 0, marginTop: 'auto' }}>
                      <button className="btn btn-sec btn-sm" onClick={() => openEditModal(q)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteQuestion(q.id)}>🗑️ Deletar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. LISTA VERTICAL */}
            {viewStyle === 'list' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {filteredQuestions.map(q => (
                  <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`} style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '10px 14px',
                    gap: '12px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelection(q.id)}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {activeDisciplina === '' && <span className="badge bb" style={{ fontSize: '10px' }}>{normalizarDisciplina(q.disciplina) || '—'}</span>}
                        {q.topico && <span className="badge bm" style={{ fontSize: '10px' }}>{normalizarTopico(q.topico)}</span>}
                        {(() => {
                          const origem = getOrigemQuestao(q);
                          return (
                            <span 
                              className="badge" 
                              style={{ 
                                background: origem.cor, 
                                color: origem.tipo === 'gemini' ? '#000' : '#fff',
                                fontSize: '9px',
                                fontWeight: 600
                              }}
                            >
                              {origem.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--txt)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.3'
                      }}>
                        {(q.enunciado || '').substring(0, 120)}...
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--mut)', flexShrink: 0 }}>
                      📅 {tempoDecorrido(q.createdAt)}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button className="btn btn-sec btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => openEditModal(q)}>✏️</button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => confirmDeleteQuestion(q.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. CARDS LARGURA TOTAL */}
            {viewStyle === 'full' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {filteredQuestions.map(q => (
                  <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px 18px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelection(q.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        {activeDisciplina === '' && <span className="badge bb">{normalizarDisciplina(q.disciplina) || '—'}</span>}
                        {q.topico && <span className="badge bm">{normalizarTopico(q.topico)}</span>}
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
                            >
                              {origem.label}
                            </span>
                          );
                        })()}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--mut)' }}>
                        📅 {tempoDecorrido(q.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: 'var(--txt)',
                      marginBottom: '12px'
                    }}>
                      {q.enunciado || ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-sec btn-sm" onClick={() => openEditModal(q)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteQuestion(q.id)}>🗑️ Deletar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. GRID 3 COLUNAS */}
            {viewStyle === 'grid3' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                alignContent: 'start'
              }}>
                {filteredQuestions.map(q => (
                  <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '150px',
                    padding: '10px'
                  }}>
                    <div className="q-meta" style={{ flexShrink: 0, marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {activeDisciplina === '' && <span className="badge bb" style={{ fontSize: '9px' }}>{normalizarDisciplina(q.disciplina) || '—'}</span>}
                        {q.topico && <span className="badge bm" style={{ fontSize: '9px' }}>{normalizarTopico(q.topico)}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelection(q.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        {(() => {
                          const origem = getOrigemQuestao(q);
                          return (
                            <span 
                              className="badge" 
                              style={{ 
                                background: origem.cor, 
                                color: origem.tipo === 'gemini' ? '#000' : '#fff',
                                fontSize: '9px',
                                fontWeight: 600
                              }}
                            >
                              {origem.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="q-text" style={{
                      flex: 1,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '10px',
                      lineHeight: '1.35',
                      marginBottom: '8px'
                    }}>{q.enunciado || ''}</div>
                    <div className="q-actions" style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sec btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => openEditModal(q)}>✏️</button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => confirmDeleteQuestion(q.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. COMPACTO */}
            {viewStyle === 'compact' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {filteredQuestions.map(q => (
                  <div key={q.id} className={`q-card ${selectedIds.has(q.id) ? 'selected' : ''}`} style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '8px 12px',
                    gap: '10px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelection(q.id)}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span className="badge bb" style={{ fontSize: '9px', flexShrink: 0 }}>
                      {normalizarDisciplina(q.disciplina) || '—'}
                    </span>
                    <div style={{
                      flex: 1,
                      fontSize: '10px',
                      color: 'var(--txt)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: '1.3'
                    }}>
                      {(q.enunciado || '').substring(0, 80)}...
                    </div>
                    {(() => {
                      const origem = getOrigemQuestao(q);
                      return (
                        <span 
                          className="badge" 
                          style={{ 
                            background: origem.cor, 
                            color: origem.tipo === 'gemini' ? '#000' : '#fff',
                            fontSize: '9px',
                            flexShrink: 0
                          }}
                        >
                          {origem.label}
                        </span>
                      );
                    })()}
                    <span style={{ fontSize: '9px', color: 'var(--mut)', flexShrink: 0 }}>
                      {tempoDecorrido(q.createdAt)}
                    </span>
                    <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                      <button className="btn btn-sec btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => openEditModal(q)}>✏️</button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => confirmDeleteQuestion(q.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. TABELA */}
            {viewStyle === 'table' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--brd)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Cabeçalho */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 100px 80px 90px',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'var(--surf2)',
                  borderBottom: '1px solid var(--brd)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--mut)'
                }}>
                  <div></div>
                  <div>Enunciado</div>
                  <div>Disciplina</div>
                  <div>Origem</div>
                  <div style={{ textAlign: 'center' }}>Ações</div>
                </div>
                {/* Linhas */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredQuestions.map(q => (
                    <div 
                      key={q.id} 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 100px 80px 90px',
                        gap: '8px',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--brd)',
                        alignItems: 'center',
                        background: selectedIds.has(q.id) ? 'var(--pri-dim)' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelection(q.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--txt)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.3'
                      }}>
                        {(q.enunciado || '').substring(0, 60)}...
                      </div>
                      <div>
                        <span className="badge bb" style={{ fontSize: '9px' }}>
                          {normalizarDisciplina(q.disciplina) || '—'}
                        </span>
                      </div>
                      <div>
                        {(() => {
                          const origem = getOrigemQuestao(q);
                          return (
                            <span 
                              className="badge" 
                              style={{ 
                                background: origem.cor, 
                                color: origem.tipo === 'gemini' ? '#000' : '#fff',
                                fontSize: '9px'
                              }}
                            >
                              {origem.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button className="btn btn-sec btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => openEditModal(q)}>✏️</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={() => confirmDeleteQuestion(q.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
              Encontramos {duplicatas.filter(d => !duplicataFoiAceita(d.q1.id, d.q2.id)).length} pares pendentes de revisão (mesmo ID de questão):
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
                        ID: [Q{dup.questaoId}]
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className={`btn btn-sm ${showGabarito ? 'btn-pri' : 'btn-sec'}`}
                  onClick={() => setShowGabarito(!showGabarito)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {showGabarito ? '🙈 Ocultar Gabarito' : '👁️ Mostrar Gabarito'}
                </button>
                <span style={{ fontSize: '14px', color: 'var(--warn)' }}>
                  ID: [Q{duplicataComparacao.questaoId}]
                </span>
              </div>
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
                  <label className="flbl" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📝 Enunciado</span>
                    <span className="badge" style={{ fontSize: '10px', background: 'var(--bg)' }}>
                      ID: {duplicataComparacao.q1.id}
                    </span>
                  </label>
                  <div style={{ 
                    background: 'var(--bg)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {duplicataComparacao.q1.enunciado || 'Sem enunciado'}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>📝 Alternativas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {duplicataComparacao.q1.alternativas?.map((alt) => (
                      <div 
                        key={alt.letra} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: showGabarito && duplicataComparacao.q1.respostaCorreta === alt.letra ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg)',
                          border: showGabarito && duplicataComparacao.q1.respostaCorreta === alt.letra ? '1px solid var(--pri)' : '1px solid transparent'
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                        <span style={{ flex: 1 }}>{alt.texto || '—'}</span>
                        {showGabarito && duplicataComparacao.q1.respostaCorreta === alt.letra && (
                          <span style={{ fontSize: '11px', color: 'var(--pri)', fontWeight: 600 }}>✓ Correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gabarito (quando visível) */}
                {showGabarito && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '10px 12px', 
                    background: 'rgba(74, 222, 128, 0.1)', 
                    borderRadius: '6px',
                    border: '1px solid var(--pri)'
                  }}>
                    <label className="flbl" style={{ fontSize: '11px', color: 'var(--pri)' }}>✅ Gabarito</label>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--pri)' }}>
                      Resposta Correta: {duplicataComparacao.q1.respostaCorreta}
                    </div>
                  </div>
                )}

                {/* Explicação */}
                {duplicataComparacao.q1.explicacao && (
                  <div style={{ marginBottom: '12px' }}>
                    <label className="flbl" style={{ fontSize: '11px' }}>💡 Explicação</label>
                    <div style={{ 
                      background: 'var(--surf1)', 
                      padding: '10px', 
                      borderRadius: '6px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--txt)',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {duplicataComparacao.q1.explicacao}
                    </div>
                  </div>
                )}

                {/* Informações Adicionais */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '10px',
                  background: 'var(--surf1)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>📚 Disciplina:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q1.disciplina || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>🏷️ Tópico:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q1.topico || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>📄 Fonte:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q1.fonte || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>🤖 Origem:</span>
                    <div style={{ fontWeight: 500 }}>
                      {duplicataComparacao.q1.geradoIA ? 'Gerado por IA' : duplicataComparacao.q1._metodo === 'parser-local' ? 'Parser Local' : 'Manual'}
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  fontSize: '10px',
                  color: 'var(--mut)',
                  padding: '8px',
                  background: 'var(--bg)',
                  borderRadius: '4px'
                }}>
                  {duplicataComparacao.q1.createdAt && (
                    <span>📅 Criada: {new Date(duplicataComparacao.q1.createdAt).toLocaleString('pt-BR')}</span>
                  )}
                  {duplicataComparacao.q1.updatedAt && duplicataComparacao.q1.updatedAt !== duplicataComparacao.q1.createdAt && (
                    <span>🔄 Atualizada: {new Date(duplicataComparacao.q1.updatedAt).toLocaleString('pt-BR')}</span>
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
                  <label className="flbl" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📝 Enunciado</span>
                    <span className="badge" style={{ fontSize: '10px', background: 'var(--bg)' }}>
                      ID: {duplicataComparacao.q2.id}
                    </span>
                  </label>
                  <div style={{ 
                    background: 'var(--bg)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {duplicataComparacao.q2.enunciado || 'Sem enunciado'}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="flbl" style={{ fontSize: '11px' }}>📝 Alternativas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {duplicataComparacao.q2.alternativas?.map((alt) => (
                      <div 
                        key={alt.letra} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: showGabarito && duplicataComparacao.q2.respostaCorreta === alt.letra ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg)',
                          border: showGabarito && duplicataComparacao.q2.respostaCorreta === alt.letra ? '1px solid var(--pri)' : '1px solid transparent'
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                        <span style={{ flex: 1 }}>{alt.texto || '—'}</span>
                        {showGabarito && duplicataComparacao.q2.respostaCorreta === alt.letra && (
                          <span style={{ fontSize: '11px', color: 'var(--pri)', fontWeight: 600 }}>✓ Correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gabarito (quando visível) */}
                {showGabarito && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '10px 12px', 
                    background: 'rgba(74, 222, 128, 0.1)', 
                    borderRadius: '6px',
                    border: '1px solid var(--pri)'
                  }}>
                    <label className="flbl" style={{ fontSize: '11px', color: 'var(--pri)' }}>✅ Gabarito</label>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--pri)' }}>
                      Resposta Correta: {duplicataComparacao.q2.respostaCorreta}
                    </div>
                  </div>
                )}

                {/* Explicação */}
                {duplicataComparacao.q2.explicacao && (
                  <div style={{ marginBottom: '12px' }}>
                    <label className="flbl" style={{ fontSize: '11px' }}>💡 Explicação</label>
                    <div style={{ 
                      background: 'var(--surf1)', 
                      padding: '10px', 
                      borderRadius: '6px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--txt)',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {duplicataComparacao.q2.explicacao}
                    </div>
                  </div>
                )}

                {/* Informações Adicionais */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '10px',
                  background: 'var(--surf1)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>📚 Disciplina:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q2.disciplina || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>🏷️ Tópico:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q2.topico || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>📄 Fonte:</span>
                    <div style={{ fontWeight: 500 }}>{duplicataComparacao.q2.fonte || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--mut)' }}>🤖 Origem:</span>
                    <div style={{ fontWeight: 500 }}>
                      {duplicataComparacao.q2.geradoIA ? 'Gerado por IA' : duplicataComparacao.q2._metodo === 'parser-local' ? 'Parser Local' : 'Manual'}
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  fontSize: '10px',
                  color: 'var(--mut)',
                  padding: '8px',
                  background: 'var(--bg)',
                  borderRadius: '4px'
                }}>
                  {duplicataComparacao.q2.createdAt && (
                    <span>📅 Criada: {new Date(duplicataComparacao.q2.createdAt).toLocaleString('pt-BR')}</span>
                  )}
                  {duplicataComparacao.q2.updatedAt && duplicataComparacao.q2.updatedAt !== duplicataComparacao.q2.createdAt && (
                    <span>🔄 Atualizada: {new Date(duplicataComparacao.q2.updatedAt).toLocaleString('pt-BR')}</span>
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

      {/* Modal Editar Questão - Design Moderno */}
      {showEditModal && editingQuestion && (
        <div className="modal-overlay" onClick={closeEditModal} style={{ backdropFilter: 'blur(4px)' }}>
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '95vw',
              maxWidth: '1400px', 
              height: '90vh',
              maxHeight: '90vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--brd)',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header Moderno com Badges */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid var(--brd)'
            }}>
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ✏️ Editar Questão
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(() => {
                    const origem = getOrigemQuestao(editingQuestion);
                    return (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: origem.cor,
                        color: origem.tipo === 'gemini' ? '#000' : '#fff'
                      }}>
                        {origem.label}
                      </span>
                    );
                  })()}
                  {editingQuestion.disciplina && (
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: 'var(--acc)',
                      color: '#fff'
                    }}>
                      {editingQuestion.disciplina}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={closeEditModal}
                style={{
                  background: 'var(--surf2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--err)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--surf2)'}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Card: Enunciado com toggle */}
              <div style={{
                background: 'var(--surf1)',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid var(--brd)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: showEnunciado ? '8px' : '0'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: 'var(--txt)'
                  }}>
                    📝 Enunciado
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEnunciado(!showEnunciado)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: showEnunciado ? 'var(--txt)' : 'var(--brd)',
                      background: showEnunciado ? 'var(--bg)' : 'transparent',
                      color: 'var(--txt)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {showEnunciado ? '📥 Recolher' : '📤 Expandir'}
                  </button>
                </div>
                {showEnunciado && (
                  <textarea
                    value={editingQuestion.enunciado}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, enunciado: e.target.value }))}
                    placeholder="Digite o enunciado da questão..."
                    required
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--brd)',
                      background: 'var(--bg)',
                      color: 'var(--txt)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                )}
              </div>

              {/* Grid: Classificação - 4 colunas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '10px'
              }}>
                {/* Disciplina */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)'
                }}>
                  <label style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--mut)',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    📚 Disciplina *
                  </label>
                  <select
                    value={editingQuestion.disciplina}
                    onChange={(e) => setEditingQuestion(prev => ({ 
                      ...prev, 
                      disciplina: e.target.value,
                      topico: ''
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--brd)',
                      background: 'var(--bg)',
                      color: 'var(--txt)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Selecione...</option>
                    {DISCIPLINAS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Tópico */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)'
                }}>
                  <label style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--mut)',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    🏷️ Tópico
                  </label>
                  <select
                    value={editingQuestion.topico}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, topico: e.target.value }))}
                    disabled={!editingQuestion.disciplina}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--brd)',
                      background: editingQuestion.disciplina ? 'var(--bg)' : 'var(--surf2)',
                      color: 'var(--txt)',
                      fontSize: '12px',
                      cursor: editingQuestion.disciplina ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <option value="">
                      {editingQuestion.disciplina ? 'Selecione...' : 'Escolha disciplina primeiro'}
                    </option>
                    {getTopicos(editingQuestion.disciplina).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Gabarito com toggle */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: showGabarito ? '8px' : '0'
                  }}>
                    <label style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--mut)'
                    }}>
                      ✅ Gabarito
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGabarito(!showGabarito)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: showGabarito ? 'var(--pri)' : 'var(--brd)',
                        background: showGabarito ? 'var(--pri)' : 'transparent',
                        color: showGabarito ? '#000' : 'var(--txt)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showGabarito ? '🙈 Ocultar' : '👁️ Revelar'}
                    </button>
                  </div>
                  {showGabarito && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                        <button
                          key={letra}
                          type="button"
                          onClick={() => setEditingQuestion(prev => ({ ...prev, respostaCorreta: letra }))}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: '6px',
                            border: '2px solid',
                            borderColor: editingQuestion.respostaCorreta === letra ? 'var(--pri)' : 'var(--brd)',
                            background: editingQuestion.respostaCorreta === letra ? 'var(--pri)' : 'var(--bg)',
                            color: editingQuestion.respostaCorreta === letra ? '#000' : 'var(--txt)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {letra}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fonte */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)'
                }}>
                  <label style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--mut)',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    📖 Fonte
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.fonte}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, fonte: e.target.value }))}
                    placeholder="Ex: Banca XYZ - 2023"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--brd)',
                      background: 'var(--bg)',
                      color: 'var(--txt)',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Layout de 2 colunas: Alternativas + Explicação */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: '10px',
                marginBottom: '10px',
                flex: 1,
                minHeight: 0
              }}>
                {/* Card: Alternativas com toggle para mostrar resposta */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <label style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--txt)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🔤 Alternativas
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRespostaCorreta(!showRespostaCorreta)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: showRespostaCorreta ? 'var(--pri)' : 'var(--brd)',
                        background: showRespostaCorreta ? 'var(--pri)' : 'transparent',
                        color: showRespostaCorreta ? '#000' : 'var(--txt)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showRespostaCorreta ? '🙈 Ocultar' : '👁️ Revelar'} Resposta
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {editingQuestion.alternativas?.map((alt) => (
                      <div 
                        key={alt.letra} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: (showRespostaCorreta && editingQuestion.respostaCorreta === alt.letra)
                            ? 'rgba(74, 222, 128, 0.15)' 
                            : 'var(--bg)',
                          border: `1px solid ${(showRespostaCorreta && editingQuestion.respostaCorreta === alt.letra) ? 'var(--pri)' : 'var(--brd)'}`
                        }}
                      >
                        <span 
                          style={{ 
                            width: '26px', 
                            height: '26px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            background: (showRespostaCorreta && editingQuestion.respostaCorreta === alt.letra) ? 'var(--pri)' : 'var(--surf2)',
                            color: (showRespostaCorreta && editingQuestion.respostaCorreta === alt.letra) ? '#000' : 'var(--txt)',
                            flexShrink: 0
                          }}
                        >
                          {alt.letra}
                        </span>
                        <input
                          type="text"
                          value={alt.texto}
                          onChange={(e) => updateEditingAlternativa(alt.letra, e.target.value)}
                          placeholder={`Texto da alternativa ${alt.letra}`}
                          required={alt.letra === 'A' || alt.letra === 'B'}
                          style={{
                            flex: 1,
                            padding: '4px 0',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--txt)',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                        {(showRespostaCorreta && editingQuestion.respostaCorreta === alt.letra) && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 600,
                            color: 'var(--pri)',
                            padding: '2px 6px',
                            background: 'rgba(74, 222, 128, 0.2)',
                            borderRadius: '4px'
                          }}>
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card: Explicação com toggle */}
                <div style={{
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid var(--brd)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: showExplicacao ? '8px' : '0'
                  }}>
                    <label style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--txt)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      💡 Explicação
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowExplicacao(!showExplicacao)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: showExplicacao ? 'var(--acc)' : 'var(--brd)',
                        background: showExplicacao ? 'var(--acc)' : 'transparent',
                        color: showExplicacao ? '#fff' : 'var(--txt)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showExplicacao ? '🙈 Ocultar' : '👁️ Revelar'} Explicação
                    </button>
                  </div>
                  {showExplicacao && (
                    <textarea
                      value={editingQuestion.explicacao}
                      onChange={(e) => setEditingQuestion(prev => ({ ...prev, explicacao: e.target.value }))}
                      placeholder="Explique a resposta correta..."
                      style={{
                        width: '100%',
                        flex: 1,
                        minHeight: '100px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--brd)',
                        background: 'var(--bg)',
                        color: 'var(--txt)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        resize: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Histórico da Questão - Layout horizontal */}
              {editingQuestion.historico && editingQuestion.historico.length > 0 && (
                <div style={{
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'var(--surf1)',
                  borderRadius: '8px',
                  border: '1px solid var(--brd)'
                }}>
                  <label style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--mut)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    📅 Histórico
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    flexWrap: 'wrap',
                    gap: '6px' 
                  }}>
                    {editingQuestion.historico.slice(0, 5).map((h, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: 'var(--bg)',
                          borderRadius: '6px'
                        }}
                      >
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 700,
                          background: h.tipo === 'criacao' ? 'var(--pri)' : h.tipo === 'importacao' ? 'var(--acc)' : 'var(--warn)',
                          color: h.tipo === 'criacao' || h.tipo === 'importacao' ? '#000' : '#fff',
                          whiteSpace: 'nowrap'
                        }}>
                          {h.tipo === 'criacao' ? 'CRIADA' : h.tipo === 'importacao' ? 'IMPORT' : 'EDIT'}
                        </span>
                        <span style={{ color: 'var(--txt)' }}>
                          {h.dataFormatada || formatarData(h.dataISO)}
                        </span>
                        {h.detalhes && (
                          <span style={{ color: 'var(--mut)', marginLeft: 'auto' }}>
                            {h.detalhes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação - Fixos no rodapé */}
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                paddingTop: '10px',
                borderTop: '1px solid var(--brd)',
                marginTop: 'auto'
              }}>
                <button 
                  type="button" 
                  onClick={closeEditModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--brd)',
                    background: 'var(--surf2)',
                    color: 'var(--txt)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--pri)',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  💾 Salvar
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