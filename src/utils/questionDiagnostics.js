/**
 * Utilitários de diagnóstico para questões no banco
 */

import { DISCIPLINAS, getTopicos } from '../config/editalConfig';

/**
 * Analisa todas as questões e retorna estatísticas de classificação
 */
export function analisarClassificacaoQuestoes(questions) {
  if (!questions || typeof questions !== 'object') {
    return { erro: 'Nenhuma questão encontrada' };
  }

  const questoesList = Object.values(questions);
  const total = questoesList.length;

  if (total === 0) {
    return { erro: 'Banco de questões vazio' };
  }

  const stats = {
    total,
    semDisciplina: 0,
    semTopico: 0,
    disciplinaInvalida: 0,
    topicoInvalido: 0,
    porDisciplina: {},
    disciplinasInvalidas: new Set(),
    topicosInvalidos: new Set(),
    questoesProblematicas: []
  };

  // Inicializar contadores para disciplinas do edital
  DISCIPLINAS.forEach(d => {
    stats.porDisciplina[d] = {
      count: 0,
      topicos: {}
    };
  });

  // Adicionar categoria para disciplinas não mapeadas
  stats.porDisciplina['_OUTRAS_'] = {
    count: 0,
    topicos: {}
  };

  questoesList.forEach((q, index) => {
    const id = q.id || `index_${index}`;
    const disciplina = q.disciplina || '';
    const topico = q.topico || '';
    const enunciado = (q.enunciado || '').substring(0, 50) + '...';

    // Verificar se tem disciplina
    if (!disciplina || disciplina.trim() === '' || disciplina === 'Geral') {
      stats.semDisciplina++;
      stats.questoesProblematicas.push({
        id,
        problema: 'SEM_DISCIPLINA',
        disciplina,
        topico,
        enunciado
      });
    }

    // Verificar se disciplina está no edital
    const disciplinaNormalizada = DISCIPLINAS.find(d => 
      d.toLowerCase().trim() === disciplina.toLowerCase().trim()
    );

    if (!disciplinaNormalizada && disciplina && disciplina !== 'Geral') {
      stats.disciplinaInvalida++;
      stats.disciplinasInvalidas.add(disciplina);
      stats.porDisciplina['_OUTRAS_'].count++;
    } else if (disciplinaNormalizada) {
      stats.porDisciplina[disciplinaNormalizada].count++;

      // Verificar tópico
      if (!topico || topico.trim() === '') {
        stats.semTopico++;
      } else {
        // Verificar se tópico é válido para a disciplina
        const topicosValidos = getTopicos(disciplinaNormalizada);
        const topicoValido = topicosValidos.some(t => 
          t.toLowerCase().trim() === topico.toLowerCase().trim()
        );

        if (!topicoValido && topicosValidos.length > 0) {
          stats.topicoInvalido++;
          stats.topicosInvalidos.add(`${disciplina} > ${topico}`);
        }

        // Contar por tópico
        const tKey = topico || '_SEM_TOPICO_';
        stats.porDisciplina[disciplinaNormalizada].topicos[tKey] = 
          (stats.porDisciplina[disciplinaNormalizada].topicos[tKey] || 0) + 1;
      }
    }
  });

  // Converter Sets para arrays
  stats.disciplinasInvalidas = Array.from(stats.disciplinasInvalidas);
  stats.topicosInvalidos = Array.from(stats.topicosInvalidos);

  return stats;
}

/**
 * Gera um relatório formatado das estatísticas
 */
export function gerarRelatorioClassificacao(stats) {
  if (stats.erro) {
    return `❌ ERRO: ${stats.erro}`;
  }

  let relatorio = [];
  relatorio.push('📊 RELATÓRIO DE CLASSIFICAÇÃO DE QUESTÕES');
  relatorio.push('='.repeat(50));
  relatorio.push('');
  relatorio.push(`📁 Total de questões: ${stats.total}`);
  relatorio.push('');

  // Problemas
  relatorio.push('🚨 PROBLEMAS ENCONTRADOS:');
  relatorio.push(`   • Sem disciplina: ${stats.semDisciplina} (${((stats.semDisciplina/stats.total)*100).toFixed(1)}%)`);
  relatorio.push(`   • Sem tópico: ${stats.semTopico} (${((stats.semTopico/stats.total)*100).toFixed(1)}%)`);
  relatorio.push(`   • Disciplina inválida: ${stats.disciplinaInvalida} (${((stats.disciplinaInvalida/stats.total)*100).toFixed(1)}%)`);
  relatorio.push(`   • Tópico inválido: ${stats.topicoInvalido} (${((stats.topicoInvalido/stats.total)*100).toFixed(1)}%)`);
  relatorio.push('');

  // Disciplinas inválidas
  if (stats.disciplinasInvalidas.length > 0) {
    relatorio.push('⚠️  DISCIPLINAS NÃO RECONHECIDAS:');
    stats.disciplinasInvalidas.forEach(d => {
      relatorio.push(`   • "${d}"`);
    });
    relatorio.push('');
  }

  // Tópicos inválidos
  if (stats.topicosInvalidos.length > 0) {
    relatorio.push('⚠️  TÓPICOS FORA DO EDITAL:');
    stats.topicosInvalidos.slice(0, 10).forEach(t => {
      relatorio.push(`   • "${t}"`);
    });
    if (stats.topicosInvalidos.length > 10) {
      relatorio.push(`   ... e mais ${stats.topicosInvalidos.length - 10}`);
    }
    relatorio.push('');
  }

  // Distribuição por disciplina
  relatorio.push('📚 DISTRIBUIÇÃO POR DISCIPLINA:');
  Object.entries(stats.porDisciplina)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([disciplina, data]) => {
      if (data.count > 0) {
        const percentual = ((data.count / stats.total) * 100).toFixed(1);
        relatorio.push(`   • ${disciplina}: ${data.count} questões (${percentual}%)`);
      }
    });
  relatorio.push('');

  // Questões problemáticas (amostra)
  if (stats.questoesProblematicas.length > 0) {
    relatorio.push('🔍 AMOSTRA DE QUESTÕES SEM CLASSIFICAÇÃO:');
    stats.questoesProblematicas.slice(0, 5).forEach(q => {
      relatorio.push(`   • ${q.enunciado}`);
      relatorio.push(`     └─ ID: ${q.id}`);
    });
    relatorio.push('');
  }

  relatorio.push('='.repeat(50));
  return relatorio.join('\n');
}

