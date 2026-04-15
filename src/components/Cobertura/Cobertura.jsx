import React, { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';

const Cobertura = () => {
  const { questions, simulados } = useStudy();
  const [expandedDisciplina, setExpandedDisciplina] = useState(null);
  const [filterDisciplina, setFilterDisciplina] = useState('');

  const questionsList = useMemo(() => Object.values(questions), [questions]);
  const simuladosList = useMemo(() => Object.values(simulados || {}), [simulados]);

  // Calcular cobertura de disciplinas
  const coberturaDisciplinas = useMemo(() => {
    const disciplinaData = {};

    // Inicializar todas as disciplinas
    questionsList.forEach((q) => {
      const disc = q.disciplina || 'Sem disciplina';
      if (!disciplinaData[disc]) {
        disciplinaData[disc] = {
          nome: disc,
          totalQuestoes: 0,
          topicos: {},
          questoesSimulado: new Set(),
          totalSimulados: 0
        };
      }
      disciplinaData[disc].totalQuestoes++;

      // Contabilizar tópicos
      if (q.topico) {
        if (!disciplinaData[disc].topicos[q.topico]) {
          disciplinaData[disc].topicos[q.topico] = {
            nome: q.topico,
            questoes: 0,
            questoesSimulado: new Set()
          };
        }
        disciplinaData[disc].topicos[q.topico].questoes++;
      }
    });

    // Verificar quais questões apareceram em simulados
    simuladosList.forEach((simulado) => {
      const questoesIds = simulado.questoes || [];
      questoesIds.forEach((qId) => {
        const questao = questionsList.find((q) => q.id === qId);
        if (questao) {
          const disc = questao.disciplina || 'Sem disciplina';
          if (disciplinaData[disc]) {
            disciplinaData[disc].questoesSimulado.add(qId);
            disciplinaData[disc].totalSimulados++;

            if (questao.topico && disciplinaData[disc].topicos[questao.topico]) {
              disciplinaData[disc].topicos[questao.topico].questoesSimulado.add(qId);
            }
          }
        }
      });
    });

    // Converter Sets para counts
    return Object.values(disciplinaData).map((d) => ({
      ...d,
      questoesSimulado: d.questoesSimulado.size,
      topicos: Object.values(d.topicos).map((t) => ({
        ...t,
        questoesSimulado: t.questoesSimulado.size
      })).sort((a, b) => b.questoes - a.questoes)
    })).sort((a, b) => b.totalQuestoes - a.totalQuestoes);
  }, [questionsList, simuladosList]);

  // Filtrar disciplinas
  const disciplinasFiltradas = useMemo(() => {
    if (!filterDisciplina) return coberturaDisciplinas;
    return coberturaDisciplinas.filter((d) => d.nome === filterDisciplina);
  }, [coberturaDisciplinas, filterDisciplina]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalDisciplinas = coberturaDisciplinas.length;
    const totalTopicos = coberturaDisciplinas.reduce(
      (acc, d) => acc + d.topicos.length,
      0
    );
    const totalQuestoes = questionsList.length;
    const totalQuestoesSimulado = simuladosList.reduce(
      (acc, s) => acc + (s.questoes?.length || 0),
      0
    );

    return {
      totalDisciplinas,
      totalTopicos,
      totalQuestoes,
      totalQuestoesSimulado,
      mediaQuestoesPorDisciplina: totalDisciplinas
        ? Math.round(totalQuestoes / totalDisciplinas)
        : 0
    };
  }, [coberturaDisciplinas, questionsList, simuladosList]);

  // Toggle expandir disciplina
  const toggleExpand = (nome) => {
    setExpandedDisciplina(expandedDisciplina === nome ? null : nome);
  };

  if (questionsList.length === 0) {
    return (
      <div style={{ maxWidth: '800px' }}>
        <div className="card">
          <div className="card-title">🗺️ Cobertura de Conteúdo</div>
          <div className="empty">
            <span className="empty-ico">🗺️</span>
            <div className="empty-ttl">Nenhuma questão cadastrada</div>
            <div className="empty-dsc">
              Adicione questões via Upload de PDF ou manualmente para visualizar a cobertura de conteúdo.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Estatísticas Gerais */}
      <div className="card mb16">
        <div className="card-title">🗺️ Cobertura de Conteúdo</div>
        <div className="flex gap12" style={{ flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--acc)' }}>
              {stats.totalDisciplinas}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Disciplinas</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--pri)' }}>
              {stats.totalTopicos}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Tópicos</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--acc)' }}>
              {stats.totalQuestoes}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Questões totais</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--pri)' }}>
              {stats.totalQuestoesSimulado}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Questões em simulados</div>
          </div>
        </div>
      </div>

      {/* Lista de Disciplinas */}
      <div className="card">
        <div className="flex ac jb mb16">
          <div className="card-title">📚 Disciplinas e Tópicos</div>
          {coberturaDisciplinas.length > 1 && (
            <select
              className="f-sel"
              value={filterDisciplina}
              onChange={(e) => setFilterDisciplina(e.target.value)}
              style={{ maxWidth: '200px' }}
            >
              <option value="">Todas disciplinas</option>
              {coberturaDisciplinas.map((d) => (
                <option key={d.nome} value={d.nome}>
                  {d.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disciplinasFiltradas.map((disc) => (
            <div key={disc.nome} className="q-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header da Disciplina */}
              <div
                onClick={() => toggleExpand(disc.nome)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  background: expandedDisciplina === disc.nome ? 'var(--surf2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '18px' }}>
                  {expandedDisciplina === disc.nome ? '📂' : '📁'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{disc.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                    {disc.topicos.length} tópicos · {disc.totalQuestoes} questões
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Mini barra de progresso */}
                  <div
                    style={{
                      width: '100px',
                      height: '6px',
                      background: 'var(--surf2)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${disc.totalQuestoes > 0 ? (disc.questoesSimulado / disc.totalQuestoes) * 100 : 0}%`,
                        height: '100%',
                        background: disc.questoesSimulado > 0 ? 'var(--pri)' : 'var(--mut)',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--mut)', minWidth: '60px' }}>
                    {disc.questoesSimulado}/{disc.totalQuestoes}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--acc)' }}>
                    {expandedDisciplina === disc.nome ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Tópicos expandidos */}
              {expandedDisciplina === disc.nome && disc.topicos.length > 0 && (
                <div style={{ borderTop: '1px solid var(--brd)' }}>
                  {disc.topicos.map((topico, index) => (
                    <div
                      key={topico.nome}
                      style={{
                        padding: '12px 16px 12px 48px',
                        borderBottom: index < disc.topicos.length - 1 ? '1px solid var(--brd)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px' }}>{topico.nome}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '80px',
                            height: '4px',
                            background: 'var(--surf2)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${topico.questoes > 0 ? (topico.questoesSimulado / topico.questoes) * 100 : 0}%`,
                              height: '100%',
                              background: topico.questoesSimulado > 0 ? 'var(--pri)' : 'var(--mut)',
                              borderRadius: '2px'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--mut)', minWidth: '50px' }}>
                          {topico.questoesSimulado}/{topico.questoes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mensagem quando não há tópicos */}
              {expandedDisciplina === disc.nome && disc.topicos.length === 0 && (
                <div
                  style={{
                    padding: '16px 16px 16px 48px',
                    borderTop: '1px solid var(--brd)',
                    fontSize: '13px',
                    color: 'var(--mut)',
                    fontStyle: 'italic'
                  }}
                >
                  Nenhum tópico cadastrado para esta disciplina
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Resumo de Cobertura */}
        {coberturaDisciplinas.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div className="card-title" style={{ fontSize: '14px', marginBottom: '12px' }}>
              📊 Resumo de Cobertura
            </div>
            <div className="note info">
              <strong>Cobertura:</strong>{' '}
              {stats.totalQuestoesSimulado} de {stats.totalQuestoes} questões ({Math.round((stats.totalQuestoesSimulado / stats.totalQuestoes) * 100) || 0}%) já apareceram em simulados.
              <br />
              <strong>Média:</strong> {stats.mediaQuestoesPorDisciplina} questões por disciplina.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cobertura;