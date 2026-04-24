import { useState, useRef, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { DISCIPLINAS, getTopicos, normalizarDisciplina, normalizarTopico } from '../../config/editalConfig';
import { geminiService } from '../../services/geminiService';

const DIFICULDADES = [
  { id: 'facil', nome: 'Fácil', descricao: 'Artigos diretos, texto claro' },
  { id: 'media', nome: 'Médio', descricao: 'Interpretação, relação entre artigos' },
  { id: 'dificil', nome: 'Difícil', descricao: 'Casos complexos, exceções, sutilezas' }
];

const LeisPDF = () => {
  const { config, addQuestion, setView, questions } = useStudy();
  const fileInputRef = useRef(null);
  
  const [modoEntrada, setModoEntrada] = useState('pdf'); // 'pdf' ou 'texto'
  const [selectedFile, setSelectedFile] = useState(null);
  const [textoLei, setTextoLei] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [topico, setTopico] = useState('');
  const [dificuldade, setDificuldade] = useState('media');
  const [quantidade, setQuantidade] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questoesGeradas, setQuestoesGeradas] = useState([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState(new Set());
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [expanded, setExpanded] = useState({});
  const [showRespostaCorreta, setShowRespostaCorreta] = useState({});
  const [showExplicacao, setShowExplicacao] = useState({});

  const topicosDisponiveis = disciplina ? getTopicos(disciplina) : [];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setErro('');
    } else {
      setErro('Por favor, selecione um arquivo PDF válido.');
    }
  };

  const validarFormulario = () => {
    if (modoEntrada === 'pdf' && !selectedFile) {
      setErro('Selecione um arquivo PDF da legislação.');
      return false;
    }
    if (modoEntrada === 'texto' && !textoLei.trim()) {
      setErro('Cole o texto da legislação.');
      return false;
    }
    if (!disciplina) {
      setErro('Selecione a disciplina.');
      return false;
    }
    if (!config?.geminiKey) {
      setErro('Configure a API Key do Gemini em Configurações primeiro.');
      return false;
    }
    return true;
  };

  const handleGerar = async () => {
    if (!validarFormulario()) return;

    setIsGenerating(true);
    setStatus('🤖 Analisando legislação e gerando questões estilo FGV...');
    setErro('');
    setQuestoesGeradas([]);
    setQuestoesSelecionadas(new Set());

    try {
      let questoes;
      if (modoEntrada === 'pdf' && selectedFile) {
        questoes = await geminiService.generateFGVQuestionsFromPDF(
          selectedFile,
          config.geminiKey,
          {
            disciplina,
            topico,
            dificuldade,
            quantidade
          }
        );
      } else {
        questoes = await geminiService.generateFGVQuestionsFromText(
          textoLei,
          config.geminiKey,
          {
            disciplina,
            topico,
            dificuldade,
            quantidade
          }
        );
      }

      // Gerar ID único para Leis PDF
      const gerarIdLeis = () => {
        return `Leis-${Date.now()}${Math.floor(Math.random() * 1000000)}`;
      };

      // Normalizar questões
      const questoesNormalizadas = questoes.map((q, index) => {
        // Adicionar identificador Leis-xxxxxx ao enunciado
        const idLeis = gerarIdLeis();
        const enunciadoComId = `[${idLeis}] ${(q.enunciado || '').trim()}`;

        return {
          id: `fgv_${Date.now()}_${index}`,
          createdAt: new Date().toISOString(),
          enunciado: enunciadoComId,
          alternativas: (q.alternativas || []).map(a => ({
            letra: (a.letra || '').toUpperCase().trim(),
            texto: (a.texto || '').trim()
          })).filter(a => a.letra && a.texto),
          respostaCorreta: (q.respostaCorreta || q.gabarito || 'A').toUpperCase().trim().charAt(0),
          explicacao: (q.explicacao || q.comentario || '').trim(),
          disciplina: normalizarDisciplina(disciplina),
          topico: topico ? normalizarTopico(topico) : '',
          fonte: `Gerado de PDF - Estilo FGV`,
          geradoIA: true,
          estiloFGV: true,
          legislacaoBase: modoEntrada === 'pdf' ? selectedFile?.name : 'Texto colado'
        };
      });

      setQuestoesGeradas(questoesNormalizadas);
      setStatus(`✅ ${questoesNormalizadas.length} questão(ões) gerada(s) no estilo FGV!`);
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

  const toggleExpand = (index) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleRespostaCorreta = (index, e) => {
    e?.stopPropagation();
    setShowRespostaCorreta(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleExplicacao = (index, e) => {
    e?.stopPropagation();
    setShowExplicacao(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questoesGeradas];
    updated[index] = { ...updated[index], [field]: value };
    setQuestoesGeradas(updated);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div className="card mb16">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">📜 Questões Leis PDF - Estilo FGV</div>
            <p style={{ margin: '8px 0 0 0', color: 'var(--mut)', fontSize: '13px' }}>
              Gere questões no estilo da banca FGV a partir de legislação (PDF ou texto)
            </p>
          </div>
          {!config?.geminiKey && (
            <div className="note warn" style={{ fontSize: '12px', padding: '8px 12px' }}>
              ⚠️ API Key não configurada
            </div>
          )}
        </div>
      </div>

      {/* Modo de Entrada */}
      <div className="card mb16">
        <div className="card-title" style={{ fontSize: '16px' }}>📥 Fonte da Legislação</div>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            className={`btn ${modoEntrada === 'pdf' ? 'btn-pri' : 'btn-sec'}`}
            onClick={() => setModoEntrada('pdf')}
            style={{ flex: 1 }}
          >
            📄 Upload PDF
          </button>
          <button
            className={`btn ${modoEntrada === 'texto' ? 'btn-pri' : 'btn-sec'}`}
            onClick={() => setModoEntrada('texto')}
            style={{ flex: 1 }}
          >
            📝 Colar Texto
          </button>
        </div>

        {modoEntrada === 'pdf' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div className="flex ac gap12">
              <button
                className="btn btn-pri"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
              >
                📂 Selecionar PDF da Lei
              </button>
              {selectedFile && (
                <span style={{ fontSize: '13px' }}>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="fg">
            <label className="flbl">Texto da Legislação</label>
            <textarea
              className="finp"
              rows={6}
              value={textoLei}
              onChange={(e) => setTextoLei(e.target.value)}
              placeholder="Cole aqui o texto da lei, decreto, resolução ou outro normativo..."
              disabled={isGenerating}
            />
            <p style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '6px' }}>
              💡 Dica: Você pode colar trechos específicos ou a lei completa
            </p>
          </div>
        )}
      </div>

      {/* Configurações */}
      <div className="card mb16">
        <div className="card-title" style={{ fontSize: '16px' }}>⚙️ Configuração FGV</div>

        <div className="fg" style={{ marginBottom: '16px' }}>
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
            <option value="">Selecione a disciplina...</option>
            {DISCIPLINAS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="fg">
            <label className="flbl">Tópico (opcional)</label>
            <select
              className="fsel"
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              disabled={!disciplina || isGenerating}
            >
              <option value="">Qualquer tópico</option>
              {topicosDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label className="flbl">Dificuldade</label>
            <select
              className="fsel"
              value={dificuldade}
              onChange={(e) => setDificuldade(e.target.value)}
              disabled={isGenerating}
            >
              {DIFICULDADES.map(d => (
                <option key={d.id} value={d.id}>{d.nome} - {d.descricao}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="fg" style={{ maxWidth: '200px' }}>
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

        {/* Info do Estilo FGV */}
        <div className="note info" style={{ fontSize: '12px', marginTop: '16px' }}>
          <strong>🎯 Estilo FGV:</strong> Questões com enunciados extensos, alternativas "cerradinhas", 
          cobrança de exceções ("exceto", "salvo"), casos práticos de administração pública e 
          interpretação sistemática entre artigos.
        </div>

        {/* Botão Gerar */}
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-pri"
            onClick={handleGerar}
            disabled={isGenerating || !config?.geminiKey}
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {isGenerating ? (
              <>
                <span className="spinner" style={{ marginRight: '8px' }}>⏳</span>
                Gerando questões estilo FGV...
              </>
            ) : (
              <>✨ Gerar {quantidade} Questão{quantidade > 1 ? 's' : ''} Estilo FGV</>
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
            {questoesGeradas.map((q, index) => {
              const isExpanded = expanded[index];
              return (
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
                    <span className="badge bb">{q.disciplina}</span>
                    {q.topico && <span className="badge bm">{q.topico}</span>}
                    <span className="badge" style={{ background: '#f472b6', color: '#fff' }}>
                      🎯 FGV
                    </span>
                    {questoesSelecionadas.has(q.id) && (
                      <span className="badge" style={{ background: 'var(--pri)', color: '#000' }}>
                        ✓ Selecionada
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '8px' }}>
                    📜 Base: {q.legislacaoBase}
                  </div>

                  {!isExpanded ? (
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      <strong>Enunciado:</strong>
                      <p style={{ margin: '6px 0 0 0' }}>{q.enunciado.substring(0, 200)}{q.enunciado.length > 200 ? '...' : ''}</p>
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
                          onChange={(e) => updateQuestion(index, 'enunciado', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Alternativas - Resposta Correta Escondida */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <strong style={{ fontSize: '12px', color: 'var(--mut)' }}>📝 Alternativas</strong>
                          <button
                            type="button"
                            onClick={(e) => toggleRespostaCorreta(index, e)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: '2px solid',
                              borderColor: showRespostaCorreta[index] ? 'var(--pri)' : 'var(--brd)',
                              background: showRespostaCorreta[index] ? 'var(--pri)' : 'transparent',
                              color: showRespostaCorreta[index] ? '#000' : 'var(--txt)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {showRespostaCorreta[index] ? '🙈 Ocultar Gabarito' : '👁️ Mostrar Gabarito'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {q.alternativas.map((alt) => (
                            <div
                              key={alt.letra}
                              style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: showRespostaCorreta[index] && q.respostaCorreta === alt.letra
                                  ? 'rgba(74, 222, 128, 0.2)'
                                  : 'var(--bg)',
                                border: showRespostaCorreta[index] && q.respostaCorreta === alt.letra
                                  ? '1px solid var(--pri)'
                                  : '1px solid transparent',
                                fontSize: '13px'
                              }}
                            >
                              <span style={{ fontWeight: 700, minWidth: '20px' }}>{alt.letra})</span>
                              <span>{alt.texto}</span>
                              {showRespostaCorreta[index] && q.respostaCorreta === alt.letra && (
                                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--pri)', fontWeight: 600 }}>✓ Correta</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explicação - Escondida */}
                      {q.explicacao && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}>
                            <strong style={{ fontSize: '12px', color: 'var(--mut)' }}>💡 Explicação / Gabarito Comentado</strong>
                            <button
                              type="button"
                              onClick={(e) => toggleExplicacao(index, e)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: '2px solid',
                                borderColor: showExplicacao[index] ? 'var(--acc)' : 'var(--brd)',
                                background: showExplicacao[index] ? 'var(--acc)' : 'transparent',
                                color: showExplicacao[index] ? '#fff' : 'var(--txt)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {showExplicacao[index] ? '🙈 Ocultar' : '👁️ Mostrar'}
                            </button>
                          </div>

                          {showExplicacao[index] && (
                            <div style={{
                              fontSize: '13px',
                              lineHeight: '1.6',
                              color: 'var(--txt)',
                              padding: '12px',
                              background: 'var(--bg)',
                              borderRadius: '8px',
                              border: '1px solid var(--brd)'
                            }}>
                              {q.explicacao}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <button
                      className="btn btn-sec btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(index);
                      }}
                    >
                      {isExpanded ? '📄 Recolher' : '✏️ Editar'}
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* Dicas Estilo FGV */}
      <div className="card" style={{ background: 'rgba(244, 114, 182, 0.05)' }}>
        <div className="card-title" style={{ fontSize: '14px' }}>🎯 Características das Questões FGV</div>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--mut)' }}>
          <li><strong>Enunciados extensos</strong> - frequentemente citam artigos e parágrafos na íntegra</li>
          <li><strong>Alternativas "cerradinhas"</strong> - diferenças sutis entre opções, exigindo atenção total</li>
          <li><strong>Cobrança de exceções</strong> - "exceto", "salvo se", "desde que", "a menos que"</li>
          <li><strong>Interpretação sistemática</strong> - relaciona diferentes artigos da mesma lei</li>
          <li><strong>Casos práticos</strong> - situações realistas de administração pública</li>
          <li><strong>Hipóteses negativas</strong> - "não está correto", "é incorreto afirmar"</li>
        </ul>
      </div>
    </div>
  );
};

export default LeisPDF;
