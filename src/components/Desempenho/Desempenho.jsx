import React, { useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';

const Desempenho = () => {
  const { questions, simulados } = useStudy();

  const questionsList = useMemo(() => Object.values(questions), [questions]);
  const simuladosList = useMemo(() => {
    const list = Object.values(simulados || {});
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [simulados]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    if (simuladosList.length === 0) {
      return {
        totalSimulados: 0,
        totalQuestoes: 0,
        totalAcertos: 0,
        mediaAcertos: 0,
        taxaAcerto: 0,
        tempoTotal: 0
      };
    }

    const totalQuestoes = simuladosList.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalAcertos = simuladosList.reduce((acc, s) => acc + (s.acertos || 0), 0);
    const tempoTotal = simuladosList.reduce((acc, s) => acc + (s.tempo_gasto || 0), 0);

    return {
      totalSimulados: simuladosList.length,
      totalQuestoes,
      totalAcertos,
      mediaAcertos: Math.round((totalAcertos / simuladosList.length) * 10) / 10,
      taxaAcerto: Math.round((totalAcertos / totalQuestoes) * 100) || 0,
      tempoTotal
    };
  }, [simuladosList]);

  // Desempenho por disciplina
  const desempenhoPorDisciplina = useMemo(() => {
    const disciplinaStats = {};

    simuladosList.forEach((simulado) => {
      const respostas = simulado.respostas || {};
      const questoesIds = simulado.questoes || [];

      questoesIds.forEach((qId) => {
        const questao = questionsList.find((q) => q.id === qId);
        if (!questao) return;

        const disciplina = questao.disciplina || 'Sem disciplina';
        const respostaUsuario = respostas[qId];
        const respostaCorreta = questao.respostaCorreta || questao.gabarito;
        const acertou = respostaUsuario && respostaUsuario === respostaCorreta;

        if (!disciplinaStats[disciplina]) {
          disciplinaStats[disciplina] = { acertos: 0, total: 0 };
        }

        disciplinaStats[disciplina].total++;
        if (acertou) disciplinaStats[disciplina].acertos++;
      });
    });

    // Converter para array e calcular porcentagem
    return Object.entries(disciplinaStats)
      .map(([nome, data]) => ({
        nome,
        ...data,
        porcentagem: Math.round((data.acertos / data.total) * 100) || 0
      }))
      .sort((a, b) => b.porcentagem - a.porcentagem);
  }, [simuladosList, questionsList]);

  // Evolução semanal (últimos 7 simulados)
  const evolucao = useMemo(() => {
    return simuladosList.slice(0, 10).reverse().map((s, index) => ({
      numero: index + 1,
      data: new Date(s.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      acertos: s.acertos || 0,
      total: s.total || 0,
      porcentagem: Math.round(((s.acertos || 0) / (s.total || 1)) * 100)
    }));
  }, [simuladosList]);

  // Formatar tempo
  const formatarTempo = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  // Cores para gráfico de barras
  const getBarColor = (porcentagem) => {
    if (porcentagem >= 70) return 'var(--pri, #00c853)';
    if (porcentagem >= 50) return 'var(--warn, #ffaa00)';
    return 'var(--danger, #ff4757)';
  };

  if (simuladosList.length === 0) {
    return (
      <div style={{ maxWidth: '800px' }}>
        <div className="card">
          <div className="card-title">📈 Desempenho</div>
          <div className="empty">
            <span className="empty-ico">📊</span>
            <div className="empty-ttl">Nenhum dado de desempenho</div>
            <div className="empty-dsc">
              Faça simulados para visualizar suas estatísticas e evolução.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Estatísticas Principais */}
      <div className="card mb16">
        <div className="card-title">📈 Visão Geral</div>
        <div className="flex gap12" style={{ flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--acc)' }}>
              {stats.totalSimulados}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Simulados</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--pri)' }}>
              {stats.totalQuestoes}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Questões respondidas</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--pri)' }}>
              {stats.taxaAcerto}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Taxa de acerto</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--acc)' }}>
              {formatarTempo(stats.tempoTotal)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mut)' }}>Tempo de estudo</div>
          </div>
        </div>
      </div>

      {/* Evolução nos últimos simulados */}
      {evolucao.length > 1 && (
        <div className="card mb16">
          <div className="card-title">📊 Evolução (últimos {evolucao.length} simulados)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '20px 0' }}>
            {evolucao.map((item, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '100%',
                  maxWidth: '50px',
                  height: `${Math.max(item.porcentagem * 1.8, 4)}px`,
                  background: getBarColor(item.porcentagem),
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                  transition: 'height 0.3s ease'
                }} />
                <div style={{ fontSize: '11px', color: 'var(--mut)', textAlign: 'center' }}>
                  {item.data}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: getBarColor(item.porcentagem) }}>
                  {item.porcentagem}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desempenho por Disciplina */}
      {desempenhoPorDisciplina.length > 0 && (
        <div className="card mb16">
          <div className="card-title">📚 Desempenho por Disciplina</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {desempenhoPorDisciplina.map((disc) => (
              <div key={disc.nome} className="flex ac" style={{ gap: '12px' }}>
                <div style={{ width: '150px', fontSize: '13px', fontWeight: 500 }}>
                  {disc.nome}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    background: 'var(--surf2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${disc.porcentagem}%`,
                      height: '100%',
                      background: getBarColor(disc.porcentagem),
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ width: '80px', fontSize: '12px', textAlign: 'right' }}>
                    <strong>{disc.porcentagem}%</strong>
                    <span style={{ color: 'var(--mut)', marginLeft: '4px' }}>
                      ({disc.acertos}/{disc.total})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Simulados */}
      <div className="card">
        <div className="card-title">📋 Histórico de Simulados</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {simuladosList.slice(0, 5).map((simulado, index) => (
            <div
              key={simulado.id}
              className="q-card"
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: `conic-gradient(${getBarColor(Math.round(((simulado.acertos || 0) / (simulado.total || 1)) * 100))} ${((simulado.acertos || 0) / (simulado.total || 1)) * 360}deg, var(--surf2) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700
              }}>
                {Math.round(((simulado.acertos || 0) / (simulado.total || 1)) * 100)}%
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  Simulado #{simuladosList.length - index}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                  {new Date(simulado.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: getBarColor(Math.round(((simulado.acertos || 0) / (simulado.total || 1)) * 100)) }}>
                  {simulado.acertos || 0}/{simulado.total || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--mut)' }}>
                  {formatarTempo(simulado.tempo_gasto || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Desempenho;