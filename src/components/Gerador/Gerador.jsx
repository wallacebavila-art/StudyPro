import React from 'react';

const Gerador = () => {
  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card mb16">
        <div className="card-title">🤖 Gerador com IA</div>
        <div className="note info mb16">
          💡 <span>Crie novas questões automaticamente usando inteligência artificial.</span>
        </div>
        <div className="flex ac gap12">
          <button className="btn btn-pri" disabled>✨ Gerar Questões</button>
          <span className="text-muted">Em desenvolvimento</span>
        </div>
      </div>
    </div>
  );
};

export default Gerador;