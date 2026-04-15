import React, { useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import StatsCard from './StatsCard';

const Dashboard = () => {
  const { questions, simulados } = useStudy();

  const stats = useMemo(() => {
    const qs = Object.values(questions);
    const sims = Object.values(simulados);

    const totalQuestions = qs.length;
    const totalSimulados = sims.length;

    const avgAcerto = sims.length
      ? Math.round(sims.reduce((a, s) => a + (s.acertos / Math.max(s.total, 1)) * 100, 0) / sims.length)
      : 0;

    const errors = new Set();
    sims.forEach(s =>
      Object.keys(s.respostas || {}).forEach(id => {
        if (s.respostas[id] !== (questions[id]?.gabarito)) errors.add(id);
      })
    );
    const totalErrors = errors.size;

    return { totalQuestions, totalSimulados, avgAcerto, totalErrors };
  }, [questions, simulados]);

  const chartData = useMemo(() => {
    const byDisc = {};
    Object.values(questions).forEach(q => {
      if (q.disciplina) {
        byDisc[q.disciplina] = (byDisc[q.disciplina] || 0) + 1;
      }
    });
    return Object.entries(byDisc).slice(0, 10);
  }, [questions]);

  const recentSims = useMemo(() => {
    return Object.values(simulados)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [simulados]);

  const weakTopics = useMemo(() => {
    const topicErrors = {};
    Object.values(simulados).forEach(s => {
      Object.keys(s.respostas || {}).forEach(id => {
        const q = questions[id];
        if (q && s.respostas[id] !== q.gabarito) {
          const key = q.topico || q.disciplina;
          topicErrors[key] = (topicErrors[key] || 0) + 1;
        }
      });
    });
    return Object.entries(topicErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [questions, simulados]);

  return (
    <div id="view-dashboard" className="view active">
      <div className="g4 mb16" id="dash-stats">
        <StatsCard value={stats.totalQuestions} label="Questões no Banco" sub="🔥 Firebase" />
        <StatsCard value={stats.totalSimulados} label="Simulados" className="y" />
        <StatsCard value={`${stats.avgAcerto}%`} label="Taxa Média" className="b" />
        <StatsCard value={stats.totalErrors} label="Com Erro" className="r" />
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-title">📊 Questões por Disciplina</div>
          <canvas id="chart-disc" height="200"></canvas>
        </div>
        <div className="card">
          <div className="card-title">📅 Últimos Simulados</div>
          <div id="dash-sims">
            {recentSims.length ? (
              recentSims.map(s => {
                const pct = Math.round((s.acertos / Math.max(s.total, 1)) * 100);
                const col = pct >= 70 ? 'var(--ok)' : pct >= 50 ? 'var(--warn)' : 'var(--err)';
                return (
                  <div key={s.id} className="flex ac jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--brd)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{s.config?.disciplina || 'Geral'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--mut)' }}>
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', color: col }}>{pct}%</div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--mut)', fontSize: '13px', padding: '20px 0' }}>
                Nenhum simulado ainda
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="g2 mt16">
        <div className="card">
          <div className="card-title">🔥 Tópicos para Melhorar</div>
          <div id="dash-weak">
            {weakTopics.length ? (
              weakTopics.map(([topic, count]) => (
                <div key={topic} className="flex ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--brd)' }}>
                  <span style={{ fontSize: '13px' }}>{topic}</span>
                  <span className="badge br">{count} erros</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--mut)', fontSize: '13px', padding: '12px 0' }}>
                Faça simulados para ver seus pontos fracos!
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-title">⚡ Ações Rápidas</div>
          <div className="flex flex-col gap8" id="dash-actions">
            <button className="btn btn-pri" onClick={() => useStudy().setView('simulado')}>
              📝 Iniciar Simulado
            </button>
            <button className="btn btn-sec" onClick={() => useStudy().setView('banco')}>
              🗄️ Banco de Questões
            </button>
            <button className="btn btn-sec" onClick={() => useStudy().setView('upload')}>
              📤 Adicionar Questões
            </button>
            <button className="btn btn-ai" onClick={() => useStudy().setView('gerador')}>
              🤖 Gerar Questões com IA
            </button>
            <button className="btn btn-sec" onClick={() => useStudy().setView('flashcards')}>
              🃏 Flashcards
            </button>
            {stats.totalErrors > 0 && (
              <button className="btn btn-warn" onClick={() => useStudy().setView('revisao')}>
                🔁 Revisar {stats.totalErrors} Erros
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;