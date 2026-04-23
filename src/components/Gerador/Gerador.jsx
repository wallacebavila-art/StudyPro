import { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, getTopicos, normalizarDisciplina, normalizarTopico } from '../../config/editalConfig';
import { geminiService } from '../../services/geminiService';

const Gerador = () => {
  const { config, addQuestion, setView, questions } = useStudy();
  const questionsList = useMemo(() => Object.values(questions || {}), [questions]);
  const [disciplina, setDisciplina] = useState('');
  const [topico, setTopico] = useState('');
  const [quantidade, setQuantidade] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questoesGeradas, setQuestoesGeradas] = useState([]);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState(new Set());

  const topicosDisponiveis = disciplina ? getTopicos(disciplina) : [];

  // Contagem de questões por disciplina
  const disciplinaCounts = useMemo(() => {
    const counts = {};
    questionsList.forEach(q => {
      const disc = normalizarDisciplina(q.disciplina);
      if (disc) {
        counts[disc] = (counts[disc] || 0) + 1;
      }
    });
    return counts;
  }, [questionsList]);

  // Contagem de questões por tópico (na disciplina selecionada)
  const topicoCounts = useMemo(() => {
    const counts = {};
    if (!disciplina) return counts;
    
    const disciplinaNormalizada = normalizarDisciplina(disciplina);
    questionsList.forEach(q => {
      if (normalizarDisciplina(q.disciplina) === disciplinaNormalizada) {
        const top = normalizarTopico(q.topico);
        if (top) {
          counts[top] = (counts[top] || 0) + 1;
        }
      }
    });
    return counts;
  }, [questionsList, disciplina]);

  const gerarPrompt = () => {
    return `Você é um especialista em criar questões de concurso público brasileiro para Analista de Segurança da Informação.

DISCIPLINA: ${disciplina}${topico ? ` - TÓPICO: ${topico}` : ''}

REGRAS IMPORTANTES:
1. Crie questões no formato de múltipla escolha (A, B, C, D, E)
2. Apenas UMA alternativa deve estar correta
3. Todas as alternativas devem ser plausíveis (não óbvias demais)
4. Enunciados claros e objetivos
5. Questões originais, não copiadas de provas existentes
6. Conteúdo técnico preciso e atualizado
7. Contexto: Analista de Segurança da Informação

FORMATO DE RESPOSTA (JSON):
[
  {
    "enunciado": "texto completo da questão",
    "alternativas": [
      {"letra": "A", "texto": "texto da alternativa A"},
      {"letra": "B", "texto": "texto da alternativa B"},
      {"letra": "C", "texto": "texto da alternativa C"},
      {"letra": "D", "texto": "texto da alternativa D"},
      {"letra": "E", "texto": "texto da alternativa E"}
    ],
    "respostaCorreta": "A",
    "explicacao": "explicação detalhada do gabarito"
  }
]

Gere ${quantidade} questão(ões) no formato JSON acima. Retorne APENAS o array JSON, sem texto adicional antes ou depois.`;
  };

  const handleGerar = async () => {
    if (!disciplina) {
      setErro('Selecione uma disciplina');
      return;
    }
    if (!config?.geminiKey) {
      setErro('Configure a API Key do Gemini em Configurações primeiro');
      return;
    }

    setIsGenerating(true);
    setStatus('🤖 Gerando questões com IA...');
    setErro('');
    setQuestoesGeradas([]);
    setQuestoesSelecionadas(new Set());

    try {
      const prompt = gerarPrompt();
      const response = await geminiService.callGemini(prompt, config.geminiKey, 8192);

      // Parse JSON
      let questoes;
      try {
        // Remover markdown code fences (```json ... ```)
        let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        // Tentar extrair JSON da resposta
        const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        let jsonText = jsonMatch ? jsonMatch[0] : cleanedResponse;
        
        // Remover trailing commas (vírgulas antes de ] ou })
        jsonText = jsonText.replace(/,\s*([\]\}])/g, '$1');
        
        questoes = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', response);
        console.error('Detalhes do erro:', parseError);
        throw new Error('Não foi possível interpretar a resposta da IA. Tente novamente.');
      }

      if (!Array.isArray(questoes) || questoes.length === 0) {
        throw new Error('Nenhuma questão foi gerada.');
      }

      // Normalizar questões
      const questoesNormalizadas = questoes.map((q, index) => ({
        id: `ia_${Date.now()}_${index}`,
        createdAt: new Date().toISOString(),
        enunciado: (q.enunciado || '').trim(),
        alternativas: (q.alternativas || []).map(a => ({
          letra: (a.letra || '').toUpperCase().trim(),
          texto: (a.texto || '').trim()
        })).filter(a => a.letra && a.texto),
        respostaCorreta: (q.respostaCorreta || q.gabarito || 'A').toUpperCase().trim().charAt(0),
        explicacao: (q.explicacao || q.comentario || '').trim(),
        disciplina: normalizarDisciplina(disciplina),
        topico: topico ? normalizarTopico(topico) : '',
        fonte: 'Gerado por IA',
        geradoIA: true
      }));

      setQuestoesGeradas(questoesNormalizadas);
      setStatus(`✅ ${questoesNormalizadas.length} questão(ões) gerada(s) com sucesso!`);

      // Selecionar todas por padrão
      setQuestoesSelecionadas(new Set(questoesNormalizadas.map(q => q.id)));

    } catch (error) {
      console.error('Erro na geração:', error);
      setErro(error.message || 'Erro ao gerar questões. Tente novamente.');
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelecao = (id) => {
    setQuestoesSelecionadas(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  };

  const selecionarTodas = () => {
    if (questoesSelecionadas.size === questoesGeradas.length) {
      setQuestoesSelecionadas(new Set());
    } else {
      setQuestoesSelecionadas(new Set(questoesGeradas.map(q => q.id)));
    }
  };

  const handleSalvar = async () => {
    const selecionadas = questoesGeradas.filter(q => questoesSelecionadas.has(q.id));
    if (selecionadas.length === 0) {
      setErro('Selecione pelo menos uma questão para salvar');
      return;
    }

    setStatus(`💾 Salvando ${selecionadas.length} questão(ões)...`);

    try {
      for (const questao of selecionadas) {
        await addQuestion(questao);
      }

      setStatus(`✅ ${selecionadas.length} questão(ões) salva(s) no banco!`);
      setQuestoesGeradas([]);
      setQuestoesSelecionadas(new Set());

      // Opcional: redirecionar para o banco após 2 segundos
      setTimeout(() => {
        setView('banco');
      }, 2000);

    } catch (error) {
      setErro('Erro ao salvar questões: ' + error.message);
    }
  };

  const handleDescartar = () => {
    if (window.confirm('Descartar todas as questões geradas?')) {
      setQuestoesGeradas([]);
      setQuestoesSelecionadas(new Set());
      setStatus('');
      setErro('');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div className="card mb16">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">🤖 Gerador de Questões com IA</div>
            <p style={{ margin: '8px 0 0 0', color: 'var(--mut)', fontSize: '13px' }}>
              Crie questões originais automaticamente usando inteligência artificial
            </p>
          </div>
          {!config?.geminiKey && (
            <div className="note warn" style={{ fontSize: '12px', padding: '8px 12px' }}>
              ⚠️ API Key não configurada
            </div>
          )}
        </div>
      </div>

      {/* Configurações */}
      <div className="card mb16">
        <div className="card-title" style={{ fontSize: '16px' }}>⚙️ Configuração</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="fg">
            <label className="flbl">Disciplina *</label>
            <select
              className="fsel"
              value={disciplina}
              onChange={(e) => {
                setDisciplina(e.target.value);
                setTopico('');
              }}
              disabled={isGenerating}
            >
              <option value="">Selecione...</option>
              {DISCIPLINAS.map(d => {
                const count = disciplinaCounts[d] || 0;
                return (
                  <option key={d} value={d}>
                    {d} ({count} questão{count !== 1 ? 's' : ''})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="fg">
            <label className="flbl">Tópico (opcional)</label>
            <select
              className="fsel"
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              disabled={!disciplina || isGenerating}
            >
              <option value="">Qualquer tópico</option>
              {topicosDisponiveis.map(t => {
                const count = topicoCounts[t] || 0;
                return (
                  <option key={t} value={t}>
                    {t} ({count} questão{count !== 1 ? 's' : ''})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="fg">
            <label className="flbl">Quantidade (1-10)</label>
            <input
              type="number"
              className="finp"
              min={1}
              max={10}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Preview do Prompt */}
        {disciplina && (
          <div className="note info" style={{ fontSize: '12px', marginTop: '12px' }}>
            <strong>📋 Contexto:</strong> Questões de <em>{disciplina}</em>
            {topico && <> - Tópico: <em>{topico}</em></>}
          </div>
        )}

        {/* Botão Gerar */}
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-pri"
            onClick={handleGerar}
            disabled={isGenerating || !disciplina || !config?.geminiKey}
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {isGenerating ? (
              <>
                <span className="spinner" style={{ marginRight: '8px' }}>⏳</span>
                Gerando com IA...
              </>
            ) : (
              <>✨ Gerar {quantidade} Questão{quantidade > 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* Status e Erros */}
        {status && (
          <div className="note" style={{ marginTop: '12px', background: 'rgba(74, 222, 128, 0.1)' }}>
            {status}
          </div>
        )}
        {erro && (
          <div className="note warn" style={{ marginTop: '12px' }}>
            ❌ {erro}
          </div>
        )}
      </div>

      {/* Questões Geradas */}
      {questoesGeradas.length > 0 && (
        <div className="card mb16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ fontSize: '16px', margin: 0 }}>
              📋 Questões Geradas ({questoesGeradas.length})
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-sec btn-sm"
                onClick={selecionarTodas}
              >
                {questoesSelecionadas.size === questoesGeradas.length ? '❌ Desmarcar Todas' : '✅ Selecionar Todas'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDescartar}
              >
                🗑️ Descartar
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {questoesGeradas.map((q, index) => (
              <div
                key={q.id}
                style={{
                  border: questoesSelecionadas.has(q.id) ? '2px solid var(--pri)' : '1px solid var(--brd)',
                  borderRadius: '10px',
                  padding: '16px',
                  background: questoesSelecionadas.has(q.id) ? 'rgba(74, 222, 128, 0.05)' : 'var(--surf)',
                  cursor: 'pointer'
                }}
                onClick={() => toggleSelecao(q.id)}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--acc)', color: '#fff' }}>
                    #{index + 1}
                  </span>
                  <span className="badge bb">{normalizarDisciplina(q.disciplina)}</span>
                  {q.topico && <span className="badge bm">{q.topico}</span>}
                  <span className="badge bai">🤖 IA</span>
                  {questoesSelecionadas.has(q.id) && (
                    <span className="badge" style={{ background: 'var(--pri)', color: '#000' }}>
                      ✓ Selecionada
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '14px', marginBottom: '12px', lineHeight: '1.6' }}>
                  <strong>Enunciado:</strong>
                  <p style={{ margin: '6px 0 0 0' }}>{q.enunciado}</p>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '12px' }}>Alternativas:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {q.alternativas.map((alt) => (
                      <div
                        key={alt.letra}
                        style={{
                          display: 'flex',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: q.respostaCorreta === alt.letra ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg)',
                          border: q.respostaCorreta === alt.letra ? '1px solid var(--pri)' : '1px solid transparent',
                          fontSize: '13px'
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                        <span>{alt.texto}</span>
                        {q.respostaCorreta === alt.letra && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--pri)' }}>✓ Correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {q.explicacao && (
                  <div style={{ fontSize: '12px', color: 'var(--mut)', padding: '8px', background: 'var(--bg)', borderRadius: '6px' }}>
                    <strong>💡 Explicação:</strong> {q.explicacao}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ações Finais */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '16px', borderTop: '1px solid var(--brd)' }}>
            <button
              className="btn btn-sec"
              onClick={handleDescartar}
            >
              ❌ Descartar Todas
            </button>
            <button
              className="btn btn-pri"
              onClick={handleSalvar}
              disabled={questoesSelecionadas.size === 0}
              style={{ padding: '12px 24px' }}
            >
              💾 Salvar {questoesSelecionadas.size > 0 && `(${questoesSelecionadas.size})`} no Banco
            </button>
          </div>

          {questoesSelecionadas.size === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--warn)', fontSize: '13px', marginTop: '12px' }}>
              Selecione pelo menos uma questão para salvar
            </p>
          )}
        </div>
      )}

      {/* Dicas */}
      <div className="card" style={{ background: 'rgba(74, 222, 128, 0.05)' }}>
        <div className="card-title" style={{ fontSize: '14px' }}>💡 Dicas para Melhores Resultados</div>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--mut)' }}>
          <li>Selecione uma disciplina específica para questões mais focadas</li>
          <li>Escolha um tópico para gerar questões sobre um assunto específico</li>
          <li>Gere pequenos lotes (3-5) para melhor qualidade</li>
          <li>Revise as questões antes de salvar no banco</li>
        </ul>
      </div>
    </div>
  );
};

export default Gerador;