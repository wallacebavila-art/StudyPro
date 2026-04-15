import React, { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';

const Revisao = () => {
  const { questions, simulados } = useStudy();
  const [selectedError, setSelectedError] = useState(null);
  const [filterDisciplina, setFilterDisciplina] = useState('');

  // Converter objetos em arrays
  const questionsList = useMemo(() => Object.values(questions), [questions]);
  const simuladosList = useMemo(() => Object.values(simulados || {}), [simulados]);

  // Calcular todos os erros dos simulados
  const erros = useMemo(() => {
    const todosErros = [];

    simuladosList.forEach((simulado) => {
      const respostas = simulado.respostas || {};
      const questoesIds = simulado.questoes || [];

      questoesIds.forEach((qId) => {
        const questao = questionsList.find((q) => q.id === qId);
        if (!questao) return;

        const respostaUsuario = respostas[qId];
        const respostaCorreta = questao.respostaCorreta || questao.gabarito;

        // Se errou ou não respondeu
        if (!respostaUsuario || respostaUsuario !== respostaCorreta) {
          todosErros.push({
            simuladoId: simulado.id,
            dataSimulado: simulado.createdAt,
            questao,
            respostaUsuario: respostaUsuario || '-',
            respostaCorreta,
            disciplina: questao.disciplina || 'Sem disciplina',
            topico: questao.topico || ''
          });
        }
      });
    });

    // Ordenar por data (mais recente primeiro)
    return todosErros.sort((a, b) => new Date(b.dataSimulado) - new Date(a.dataSimulado));
  }, [simuladosList, questionsList]);

  // Filtrar por disciplina
  const errosFiltrados = useMemo(() => {
    if (!filterDisciplina) return erros;
    return erros.filter((e) => e.disciplina === filterDisciplina);
  }, [erros, filterDisciplina]);

  // Disciplinas disponíveis nos erros
  const disciplinasErros = useMemo(() => {
    return [...new Set(erros.map((e) => e.disciplina))].sort();
  }, [erros]);

  // Estatísticas
  const stats = useMemo(() => {
    const porDisciplina = {};
    erros.forEach((e) => {
      porDisciplina[e.disciplina] = (porDisciplina[e.disciplina] || 0) + 1;
    });

    return {
      totalErros: erros.length,
      porDisciplina
    };
  }, [erros]);

  if (selectedError) {
    const q = selectedError.questao;
    return (
      <div style={{ maxWidth: '800px' }}>
        <div className="card mb16">
          <div className="flex ac jb mb16">
            <button
              className="btn btn-sec btn-sm"
              onClick={() => setSelectedError(null)}
            >
              ← Voltar
            </button>
            <div className="q-meta">
              <span className="badge bb">{q.disciplina || '—'}</span>
              {q.topico && <span className="badge bm">{q.topico}</span>}
            </div>
          </div>

          <div className="q-text" style={{ marginBottom: '20px', fontSize: '16px' }}>
            {q.enunciado}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {q.alternativas?.map((alt) => {
              const isUserAnswer = alt.letra === selectedError.respostaUsuario;
              const isCorrect = alt.letra === selectedError.respostaCorreta;

              let bgColor = 'var(--surf2)';
              let borderColor = 'var(--brd)';
              let icon = '';

              if (isCorrect) {
                bgColor = 'var(--pri-dim, rgba(0, 200, 83, 0.15))';
                borderColor = 'var(--pri, #00c853)';
                icon = ' ✅ Correta';
              } else if (isUserAnswer && !isCorrect) {
                bgColor = 'rgba(255, 71, 87, 0.15)';
                borderColor = 'var(--danger, #ff4757)';
                icon = ' ❌ Sua resposta';
              }

              return (
                <div
                  key={alt.letra}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    fontSize: '14px'
                  }}
                >
                  <strong>{alt.letra})</strong> {alt.texto}{icon}
                </div>
              );
            })}
          </div>

          {q.explicacao && (
            <div className="note info" style={{ marginBottom: '16px' }}>
              <strong>📚 Explicação:</strong><br />
              {q.explicacao}
            </div>
          )}

          <div className="flex ac gap8" style={{ fontSize: '12px', color: 'var(--mut)' }}>
            <span>📅 Simulado: {new Date(selectedError.dataSimulado).toLocaleDateString('pt-BR')}</span>
            {q.fonte && <span>· Fonte: {q.fonte}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header com estatísticas */}
      <div className="card mb16">
        <div className="card-title">🔁 Revisão de Erros</div>

        {erros.length === 0 ? (
          <div className="empty">
            <span className="empty-ico">🎉</span>
            <div className="empty-ttl">Nenhum erro encontrado!</div>
            <div className="empty-dsc">
              Faça simulados para ver suas questões erradas aqui.
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap12 mb16" style={{ flexWrap: 'wrap' }}>
              <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--danger)' }}>
                  {stats.totalErros}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Questões erradas</div>
              </div>
              <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--pri)' }}>
                  {disciplinasErros.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Disciplinas</div>
              </div>
              <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--acc)' }}>
                  {simuladosList.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Simulados</div>
              </div>
            </div>

            {/* Filtro por disciplina */}
            <div className="flex ac gap8 mb16">
              <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Filtrar:</span>
              <select
                className="f-sel"
                value={filterDisciplina}
                onChange={(e) => setFilterDisciplina(e.target.value)}
                style={{ flex: 1, maxWidth: '250px' }}
              >
                <option value="">Todas disciplinas</option>
                {disciplinasErros.map((d) => (
                  <option key={d} value={d}>
                    {d} ({stats.porDisciplina[d]})
                  </option>
                ))}
              </select>
              {filterDisciplina && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilterDisciplina('')}
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Lista de erros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {errosFiltrados.map((erro, index) => (
                <div
                  key={`${erro.simuladoId}-${erro.questao.id}-${index}`}
                  className="q-card"
                  style={{ cursor: 'pointer', padding: '16px' }}
                  onClick={() => setSelectedError(erro)}
                >
                  <div className="q-meta" style={{ marginBottom: '8px' }}>
                    <span className="badge bb">{erro.disciplina}</span>
                    {erro.topico && <span className="badge bm">{erro.topico}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--mut)' }}>
                      {new Date(erro.dataSimulado).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="q-text" style={{ marginBottom: '12px', fontSize: '14px' }}>
                    {erro.questao.enunciado?.substring(0, 150)}
                    {erro.questao.enunciado?.length > 150 ? '...' : ''}
                  </div>

                  <div className="flex ac gap12" style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--danger)' }}>
                      ❌ Você: <strong>{erro.respostaUsuario}</strong>
                    </span>
                    <span style={{ color: 'var(--pri)' }}>
                      ✅ Correta: <strong>{erro.respostaCorreta}</strong>
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--acc)' }}>
                      📖 Revisar →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Disciplinas com mais erros */}
            {Object.entries(stats.porDisciplina).length > 0 && !filterDisciplina && (
              <div style={{ marginTop: '24px' }}>
                <div className="card-title" style={{ fontSize: '14px', marginBottom: '12px' }}>
                  📊 Erros por Disciplina
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(stats.porDisciplina)
                    .sort((a, b) => b[1] - a[1])
                    .map(([disc, count]) => (
                      <div
                        key={disc}
                        className="flex ac jb"
                        style={{
                          padding: '10px 12px',
                          background: 'var(--surf2)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setFilterDisciplina(disc)}
                      >
                        <span style={{ fontSize: '13px' }}>{disc}</span>
                        <div className="flex ac gap8">
                          <div
                            style={{
                              width: `${Math.min((count / stats.totalErros) * 200, 100)}px`,
                              height: '6px',
                              background: 'var(--danger)',
                              borderRadius: '3px'
                            }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--mut)', minWidth: '30px' }}>
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Revisao;