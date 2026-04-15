import React, { useState, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const Simulado = () => {
  const { questions, addSimulado } = useStudy();
  const [config, setConfig] = useState({
    disciplina: '',
    topico: '',
    dificuldade: '',
    quantidade: 10,
    tempo: 3,
    modo: 'normal'
  });
  const [simuladoState, setSimuladoState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timer, setTimer] = useState(null);

  const questionsList = Object.values(questions);

  const disciplinas = [...new Set(questionsList.map(q => q.disciplina).filter(Boolean))].sort();

  const topicos = config.disciplina
    ? [...new Set(questionsList.filter(q => q.disciplina === config.disciplina).map(q => q.topico).filter(Boolean))].sort()
    : [];

  const availableQuestions = questionsList.filter(q => {
    if (config.disciplina && q.disciplina !== config.disciplina) return false;
    if (config.topico && q.topico !== config.topico) return false;
    if (config.dificuldade && q.dificuldade !== config.dificuldade) return false;
    return true;
  });

  const startSimulado = () => {
    const selectedQuestions = availableQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(config.quantidade, availableQuestions.length));

    if (selectedQuestions.length === 0) {
      alert('Nenhuma questão disponível com esses filtros.');
      return;
    }

    const newSimulado = {
      questions: selectedQuestions,
      config,
      answers: {},
      startTime: Date.now(),
      current: 0
    };

    setSimuladoState(newSimulado);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(config.tempo * 60 * selectedQuestions.length);

    if (config.tempo > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            finishSimulado();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimer(interval);
    }
  };

  const finishSimulado = async () => {
    if (timer) clearInterval(timer);

    const correct = simuladoState.questions.filter(q => answers[q.id] === q.gabarito).length;
    const simulado = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      config: simuladoState.config,
      questoes: simuladoState.questions.map(q => q.id),
      respostas: answers,
      acertos: correct,
      total: simuladoState.questions.length,
      tempo_gasto: Math.floor((Date.now() - simuladoState.startTime) / 1000)
    };

    await addSimulado(simulado);
    alert(`Simulado finalizado! ${correct}/${simuladoState.questions.length} acertos.`);
    setSimuladoState(null);
  };

  const selectAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (currentQuestion < simuladoState.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  useKeyboardShortcuts({
    onArrowRight: nextQuestion,
    onArrowLeft: prevQuestion,
    onKey: (key) => {
      if (simuladoState) {
        selectAnswer(simuladoState.questions[currentQuestion].id, key);
      }
    }
  });

  if (simuladoState) {
    const q = simuladoState.questions[currentQuestion];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div id="view-simulado" className="view active">
        <div className="quiz-wrap">
          <div className="quiz-hd">
            <div>
              <div style={{ fontSize: '11px', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '2px' }}>
                Em andamento
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {q.disciplina}{q.topico ? ' · ' + q.topico : ''}
              </div>
            </div>
            <div className="flex ac gap12">
              <div className={`timer ${timeLeft < 120 ? 'warn' : ''} ${timeLeft < 60 ? 'dng' : ''}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (confirm('Encerrar?')) finishSimulado();
              }}>✕ Encerrar</button>
            </div>
          </div>

          <div className="prog-dots">
            {simuladoState.questions.map((_, i) => (
              <div
                key={i}
                className={`pd ${i === currentQuestion ? 'cur' : ''} ${answers[simuladoState.questions[i].id] ? 'ans' : ''}`}
                onClick={() => setCurrentQuestion(i)}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div id="quiz-body">
            <div className="q-num">QUESTÃO {currentQuestion + 1} / {simuladoState.questions.length}</div>
            <div className="q-body">{q.enunciado}</div>
            <div className="alts">
              {(q.alternativas || []).map(alt => (
                <button
                  key={alt.letra}
                  className={`alt ${answers[q.id] === alt.letra ? 'sel' : ''}`}
                  onClick={() => selectAnswer(q.id, alt.letra)}
                >
                  <span className="alt-l">{alt.letra})</span>
                  <span>{alt.texto}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-actions">
            {currentQuestion > 0 && (
              <button className="btn btn-ghost" onClick={prevQuestion}>← Anterior</button>
            )}
            <span style={{ flex: 1 }}></span>
            {currentQuestion < simuladoState.questions.length - 1 ? (
              <button className="btn btn-sec" onClick={nextQuestion}>Próxima →</button>
            ) : (
              <button className="btn btn-pri" onClick={finishSimulado}>✅ Finalizar</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="view-simulado" className="view active">
      <div id="sim-config">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card-title">📝 Configurar Simulado</div>
          <div className="fg">
            <label className="flbl">Disciplina</label>
            <select
              className="fsel"
              value={config.disciplina}
              onChange={(e) => setConfig({ ...config, disciplina: e.target.value, topico: '' })}
            >
              <option value="">Todas as disciplinas</option>
              {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="flbl">Tópico</label>
            <select
              className="fsel"
              value={config.topico}
              onChange={(e) => setConfig({ ...config, topico: e.target.value })}
            >
              <option value="">Todos os tópicos</option>
              {topicos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="flbl">Dificuldade</label>
            <select
              className="fsel"
              value={config.dificuldade}
              onChange={(e) => setConfig({ ...config, dificuldade: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="facil">Fácil</option>
              <option value="media">Média</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
          <div className="fg">
            <label className="flbl">Quantidade</label>
            <input
              className="finp"
              type="number"
              value={config.quantidade}
              onChange={(e) => setConfig({ ...config, quantidade: parseInt(e.target.value) || 10 })}
              min="1"
              max="100"
            />
          </div>
          <div className="fg">
            <label className="flbl">Tempo por questão (min · 0 = sem limite)</label>
            <input
              className="finp"
              type="number"
              value={config.tempo}
              onChange={(e) => setConfig({ ...config, tempo: parseInt(e.target.value) || 0 })}
              min="0"
              max="10"
            />
          </div>
          <div className="note info mb16">
            ℹ️ <span><strong>{availableQuestions.length}</strong> questão{availableQuestions.length !== 1 ? 's' : ''} disponível{availableQuestions.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="btn btn-pri btn-lg" onClick={startSimulado}>🚀 Iniciar Simulado</button>
        </div>
      </div>
    </div>
  );
};

export default Simulado;