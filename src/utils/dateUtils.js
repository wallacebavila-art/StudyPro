/**
 * Utilitários para formatação de datas e histórico
 */

/**
 * Formata uma data para exibição amigável (DD/MM/YYYY HH:MM)
 */
export function formatarData(data) {
  if (!data) return '—';
  
  const d = new Date(data);
  if (isNaN(d.getTime())) return '—';
  
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  const hora = d.getHours().toString().padStart(2, '0');
  const minuto = d.getMinutes().toString().padStart(2, '0');
  
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

/**
 * Formata apenas a data (DD/MM/YYYY)
 */
export function formatarDataCurta(data) {
  if (!data) return '—';
  
  const d = new Date(data);
  if (isNaN(d.getTime())) return '—';
  
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata apenas o horário (HH:MM)
 */
export function formatarHora(data) {
  if (!data) return '—';
  
  const d = new Date(data);
  if (isNaN(d.getTime())) return '—';
  
  const hora = d.getHours().toString().padStart(2, '0');
  const minuto = d.getMinutes().toString().padStart(2, '0');
  
  return `${hora}:${minuto}`;
}

/**
 * Retorna o timestamp atual completo
 */
export function getTimestamp() {
  const agora = new Date();
  return {
    iso: agora.toISOString(),
    formatado: formatarData(agora),
    ano: agora.getFullYear(),
    mes: agora.getMonth() + 1,
    dia: agora.getDate(),
    hora: agora.getHours(),
    minuto: agora.getMinutes(),
    segundo: agora.getSeconds()
  };
}

/**
 * Cria um registro de histórico para uma questão
 */
export function criarHistorico(tipo, detalhes = '') {
  const ts = getTimestamp();
  return {
    tipo, // 'criacao', 'edicao', 'importacao'
    dataISO: ts.iso,
    dataFormatada: ts.formatado,
    ano: ts.ano,
    mes: ts.mes,
    dia: ts.dia,
    hora: ts.hora,
    minuto: ts.minuto,
    detalhes
  };
}

/**
 * Adiciona um evento ao histórico de uma questão
 */
export function adicionarAoHistorico(questao, tipo, detalhes = '') {
  if (!questao.historico) {
    questao.historico = [];
  }
  
  questao.historico.push(criarHistorico(tipo, detalhes));
  
  // Atualiza o createdAt se for a primeira criação
  if (tipo === 'criacao' || tipo === 'importacao') {
    questao.createdAt = new Date().toISOString();
  }
  
  // Atualiza o updatedAt para qualquer alteração
  questao.updatedAt = new Date().toISOString();
  
  return questao;
}

/**
 * Retorna a última data de modificação de uma questão
 */
export function getUltimaModificacao(questao) {
  if (questao.updatedAt) {
    return formatarData(questao.updatedAt);
  }
  if (questao.createdAt) {
    return formatarData(questao.createdAt);
  }
  return '—';
}

/**
 * Retorna a data de criação formatada
 */
export function getDataCriacao(questao) {
  if (questao.createdAt) {
    return formatarData(questao.createdAt);
  }
  return '—';
}

/**
 * Calcula há quanto tempo a questão foi criada
 */
export function tempoDecorrido(data) {
  if (!data) return '—';
  
  const d = new Date(data);
  if (isNaN(d.getTime())) return '—';
  
  const agora = new Date();
  const diffMs = agora - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHora = Math.floor(diffMin / 60);
  const diffDia = Math.floor(diffHora / 24);
  
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHora < 24) return `há ${diffHora}h`;
  if (diffDia === 1) return 'ontem';
  if (diffDia < 30) return `há ${diffDia} dias`;
  
  return formatarDataCurta(data);
}
