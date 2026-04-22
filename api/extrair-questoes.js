/**
 * API Endpoint: /api/extrair-questoes
 * 
 * Recebe upload de PDF, extrai texto e processa questões estruturadas
 * usando regex. Retorna JSON no formato especificado.
 * 
 * Método: POST
 * Content-Type: multipart/form-data
 * Limite: 4MB
 */

import pdfParse from 'pdf-parse';
import busboy from 'busboy';

/**
 * Parser principal de questões - versão aprimorada e mais precisa
 * Extrai questões do texto usando múltiplos padrões de concurso público
 * com validação de qualidade e extração de gabarito
 */
function parseQuestoes(texto) {
  const questoes = [];
  console.log('📝 Texto recebido (primeiros 1000 chars):', texto.substring(0, 1000));
  console.log('📏 Tamanho total do texto:', texto.length, 'caracteres');
  
  // Limpar texto: normalizar espaços e quebras de linha, mas preservar estrutura
  const textoLimpo = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n'); // Normalizar múltiplas quebras
  
  // Extrair gabarito global do documento (se existir)
  const gabaritoGlobal = extrairGabaritoGlobal(textoLimpo);
  console.log('📝 Gabarito global encontrado:', gabaritoGlobal ? Object.keys(gabaritoGlobal).length + ' respostas' : 'Nenhum');
  
  // Múltiplos padrões de numeração de questões - mais abrangentes
  const padroesQuestao = [
    // Padrão CESPE/CEBRASPE: "1. [Q123456]" ou "1. [123456]"
    { 
      regex: /(?:^|\n)\s*(\d+)\.\s*\[?Q?(\d+)\]?\s*\n?([\s\S]*?)(?=(?:\n\s*\d+\.\s*\[?Q?\d*\]?)|(?:\n\s*Questão\s+\d+)|(?:\n\s*\d+[.\)])|$)/gi,
      nome: 'CESPE/CEBRASPE',
      temCodigo: true
    },
    // Padrão FCC/VUNESP: "Questão 1." ou "QUESTÃO 01"
    {
      regex: /(?:^|\n)\s*(?:Quest[ãa]o|QUEST[ÃA]O)\s*(\d+)[.:\-]?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:Quest[ãa]o|QUEST[ÃA]O)\s*\d+)|(?:\n\s*\d+[.\)])|$)/gi,
      nome: 'FCC/VUNESP',
      temCodigo: false
    },
    // Padrão simples: "1." ou "1)" ou "1-" seguido de texto
    {
      regex: /(?:^|\n)\s*(\d{1,3})[.\)\-\]]\s*([\s\S]*?)(?=(?:\n\s*\d{1,3}[.\)\-\]])|(?:\n\s*(?:Quest[ãa]o|QUEST[ÃA]O)\s*\d+)|(?:\n\s*GABARITO)|(?:\n\s*RESPOSTAS)|$)/gi,
      nome: 'Numeração simples',
      temCodigo: false
    },
    // Padrão parênteses: "(1)" ou "(01)"
    {
      regex: /(?:^|\n)\s*\((\d{1,3})\)\s*([\s\S]*?)(?=(?:\n\s*\(\d{1,3}\))|(?:\n\s*\d+[.\)])|(?:\n\s*(?:Quest[ãa]o|QUEST[ÃA]O)\s*\d+)|$)/gi,
      nome: 'Parênteses',
      temCodigo: false
    }
  ];
  
  let melhorPadrao = null;
  let maxQuestoes = 0;
  
  // Testar cada padrão e escolher o que encontrar mais questões válidas
  for (const padrao of padroesQuestao) {
    const resultado = testarPadrao(textoLimpo, padrao);
    console.log(`🔍 Padrão ${padrao.nome}: ${resultado.length} questões válidas`);
    
    if (resultado.length > maxQuestoes) {
      maxQuestoes = resultado.length;
      melhorPadrao = { ...padrao, questoes: resultado };
    }
  }
  
  // Se encontrou um padrão bom, usar ele
  if (melhorPadrao && melhorPadrao.questoes.length > 0) {
    console.log(`✅ Usando padrão: ${melhorPadrao.nome} (${melhorPadrao.questoes.length} questões)`);
    
    for (const q of melhorPadrao.questoes) {
      const questaoProcessada = processarQuestao(q, melhorPadrao.temCodigo, gabaritoGlobal);
      if (questaoProcessada) {
        questoes.push(questaoProcessada);
      }
    }
  }
  
  // Fallback: tentar extrair por blocos de alternativas
  if (questoes.length === 0) {
    console.log('🔄 Tentando extração por blocos de alternativas...');
    const questoesBloco = extrairPorBlocosAlternativas(textoLimpo);
    questoes.push(...questoesBloco);
  }
  
  // Ordenar por número
  questoes.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
  
  // Remover duplicatas (mesmo número)
  const questoesUnicas = [];
  const numerosVistos = new Set();
  for (const q of questoes) {
    if (!numerosVistos.has(q.numero)) {
      numerosVistos.add(q.numero);
      questoesUnicas.push(q);
    }
  }
  
  console.log(`📊 Total de questões extraídas: ${questoesUnicas.length} (de ${questoes.length} brutas)`);
  return questoesUnicas;
}

/**
 * Testa um padrão de regex e retorna as questões encontradas
 */
function testarPadrao(texto, padrao) {
  const questoes = [];
  let match;
  let count = 0;
  
  // Resetar lastIndex
  padrao.regex.lastIndex = 0;
  
  while ((match = padrao.regex.exec(texto)) !== null && count < 200) {
    count++;
    const numero = match[1];
    const codigo = padrao.temCodigo ? (match[2] || null) : null;
    const conteudo = padrao.temCodigo ? match[3] : match[2];
    
    if (!conteudo || conteudo.trim().length < 20) continue; // Ignorar muito curtos
    
    questoes.push({
      numero,
      codigo,
      conteudo: conteudo.trim(),
      matchIndex: match.index
    });
  }
  
  return questoes;
}

/**
 * Processa uma questão individual - extração profunda
 */
function processarQuestao(q, temCodigo, gabaritoGlobal) {
  console.log(`🔍 Processando questão ${q.numero}...`);
  
  // Extrair alternativas com método aprimorado
  const alternativas = extrairAlternativasAprimorado(q.conteudo);
  
  // Validar: precisa ter pelo menos 2 alternativas (algumas questões têm só 2)
  if (alternativas.length < 2) {
    console.log(`⚠️ Questão ${q.numero} ignorada: apenas ${alternativas.length} alternativa(s)`);
    return null;
  }
  
  // Separar enunciado
  const enunciado = separarEnunciadoAprimorado(q.conteudo, alternativas);
  
  // Validar enunciado
  if (!enunciado || enunciado.length < 10) {
    console.log(`⚠️ Questão ${q.numero} ignorada: enunciado muito curto`);
    return null;
  }
  
  // Extrair metadados
  const { disciplina, topico, fonte } = extrairMetadados(q.conteudo, alternativas);
  
  // Buscar resposta correta
  const respostaCorreta = buscarRespostaCorreta(q.numero, q.conteudo, gabaritoGlobal, alternativas);
  
  const questao = {
    id: `q_${Date.now()}_${q.numero}`,
    numero: q.numero,
    codigo: temCodigo && q.codigo ? q.codigo : `Q${q.numero}`,
    enunciado: enunciado,
    alternativas: alternativas.map((texto, idx) => ({
      letra: String.fromCharCode(65 + idx), // A, B, C...
      texto: texto.replace(/^[a-e][.\)]\s*/i, '').trim()
    })),
    respostaCorreta: respostaCorreta,
    disciplina: disciplina,
    topico: topico,
    fonte: fonte
  };
  
  console.log(`✅ Questão ${q.numero} extraída (${alternativas.length} alternativas${respostaCorreta ? ', resposta: ' + respostaCorreta : ''})`);
  return questao;
}

/**
 * Extrai gabarito global do documento (tabela de respostas no final)
 */
function extrairGabaritoGlobal(texto) {
  const gabarito = {};
  
  // Procurar por seção de gabarito
  const padroesGabarito = [
    // "GABARITO" ou "RESPOSTAS" seguido de lista
    /(?:GABARITO|RESPOSTAS|GABARITO COMENTADO|RESPOSTA CORRETA)[\s\S]*?(\d+)\s*[-.)]?\s*([a-eA-E])/gi,
    // Formato tabela: 1-A, 1 A, 1) A
    /(?:^|\n)\s*(\d{1,3})\s*[\s.)-]\s*([a-eA-E])\b/gi,
    // Formato: 1. Resposta: A ou Resposta 1: A
    /(?:Quest[ãa]o|Quest|Q)\s*(\d+).*?(?:resposta|gabarito).*?[:\s]+([a-eA-E])\b/gi
  ];
  
  for (const padrao of padroesGabarito) {
    let match;
    while ((match = padrao.exec(texto)) !== null) {
      const numQuestao = parseInt(match[1]);
      const resposta = match[2].toUpperCase();
      if (numQuestao > 0 && numQuestao <= 200) {
        gabarito[numQuestao] = resposta;
      }
    }
  }
  
  return Object.keys(gabarito).length > 0 ? gabarito : null;
}

/**
 * Extrai alternativas de forma aprimorada - múltiplos padrões e validação
 */
function extrairAlternativasAprimorado(conteudo) {
  const alternativas = [];
  const letrasEncontradas = new Set();
  
  // Padrões aprimorados para alternativas
  const padroes = [
    // Padrão padrão: a) texto, a. texto, a) texto, a - texto
    {
      regex: /(?:^|\n)\s*([a-eA-E])\s*[.\)\-\]]\s*(.+?)(?=(?:\n\s*[a-eA-E]\s*[.\)\-\]]\s)|(?:\n\s*(?:Resposta|Gabarito|Coment[áa]rio))|$)/gi,
      nome: 'Padrão'
    },
    // Padrão inline: a) texto b) texto (na mesma linha)
    {
      regex: /([a-eA-E])\s*[.\)]\s*([^\n]{5,100}?)(?=\s+[a-eA-E]\s*[.\)]|\s*$)/gi,
      nome: 'Inline'
    },
    // Padrão colchetes: [a] texto ou a] texto
    {
      regex: /(?:^|\n)\s*\[?([a-eA-E])\]?\s*[.\)]?\s*(.+?)(?=(?:\n\s*\[?[a-eA-E]\]?)|(?:\n\s*(?:Resposta|Gabarito))|$)/gi,
      nome: 'Colchetes'
    }
  ];
  
  // Tentar cada padrão
  for (const padrao of padroes) {
    padrao.regex.lastIndex = 0;
    let match;
    
    while ((match = padrao.regex.exec(conteudo)) !== null) {
      const letra = match[1].toLowerCase();
      let texto = match[2].trim();
      
      // Limpar texto da alternativa
      texto = texto
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .substring(0, 500); // Limite de tamanho
      
      // Ignorar se muito curto ou já temos essa letra
      if (texto.length < 2 || letrasEncontradas.has(letra)) continue;
      
      // Validar: não deve conter outras alternativas no texto
      if (/^[a-e]\s*[.\)]/.test(texto)) continue;
      
      letrasEncontradas.add(letra);
      alternativas.push({
        letra: letra.toUpperCase(),
        texto: `${letra.toUpperCase()}) ${texto}`
      });
    }
    
    // Se encontrou pelo menos 2 alternativas, parar
    if (alternativas.length >= 2) break;
    
    // Limpar para tentar próximo padrão
    alternativas.length = 0;
    letrasEncontradas.clear();
  }
  
  // Ordenar por letra (A, B, C...)
  alternativas.sort((a, b) => a.letra.localeCompare(b.letra));
  
  // Fallback: extração linha por linha mais permissiva
  if (alternativas.length < 2) {
    const linhas = conteudo.split('\n');
    const padraoLinha = /^\s*([a-eA-E])\s*[.\)\]\-]\s*(.+)/i;
    
    for (const linha of linhas) {
      const match = linha.match(padraoLinha);
      if (match) {
        const letra = match[1].toLowerCase();
        if (!letrasEncontradas.has(letra)) {
          const texto = match[2].trim().substring(0, 500);
          if (texto.length >= 2) {
            letrasEncontradas.add(letra);
            alternativas.push({
              letra: letra.toUpperCase(),
              texto: `${letra.toUpperCase()}) ${texto}`
            });
          }
        }
      }
    }
    
    alternativas.sort((a, b) => a.letra.localeCompare(b.letra));
  }
  
  return alternativas.map(a => a.texto);
}

/**
 * Separa enunciado do conteúdo da questão
 */
function separarEnunciadoAprimorado(conteudo, alternativas) {
  if (!alternativas || alternativas.length === 0) {
    // Tentar extrair primeiro parágrafo significativo
    const paragrafos = conteudo.split('\n\n');
    for (const p of paragrafos) {
      const limpo = p.trim();
      if (limpo.length > 20 && !/^[a-eA-E]\s*[.\)]/.test(limpo)) {
        return limpo.substring(0, 1000);
      }
    }
    return conteudo.substring(0, 500);
  }
  
  // Encontrar posição da primeira alternativa
  const primeiraAlt = alternativas[0];
  const letra = primeiraAlt.charAt(0).toLowerCase();
  
  // Padrões para encontrar início da primeira alternativa
  const padroesBusca = [
    new RegExp(`\\n\\s*${letra}\\s*[.\\)\\-\\]]`, 'i'),
    new RegExp(`\\b${letra}\\s*[.\\)\\-\\]]`, 'i'),
    new RegExp(`${letra}[.\\)\\-\\]]`, 'i')
  ];
  
  for (const padrao of padroesBusca) {
    const match = conteudo.match(padrao);
    if (match && match.index > 20) {
      let enunciado = conteudo.substring(0, match.index).trim();
      
      // Limpar: remover número da questão no início
      enunciado = enunciado.replace(/^\s*\d+[.\)\-\]]\s*/, '').trim();
      
      // Remover linhas de metadados
      enunciado = enunciado
        .replace(/Disciplinas?[/\\]Assuntos?\s*vinculados?:.*$/gmi, '')
        .replace(/Fonte:\s*.*$/gmi, '')
        .replace(/Banca:\s*.*$/gmi, '')
        .trim();
      
      // Remover gabarito inline
      enunciado = enunciado
        .replace(/\n\s*(?:Gabarito|Resposta)\s*[:\s]+[a-eA-E]\b/gi, '')
        .trim();
      
      if (enunciado.length >= 10) {
        return enunciado.substring(0, 1500);
      }
    }
  }
  
  // Fallback: dividir em linhas e pegar as primeiras que não são alternativas
  const linhas = conteudo.split('\n');
  const enunciadoLinhas = [];
  
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa) continue;
    
    // Parar quando encontrar alternativa
    if (/^[a-eA-E]\s*[.\)\-]/.test(limpa)) break;
    if (/^\d+[.\)\-]/.test(limpa) && enunciadoLinhas.length > 0) break;
    
    enunciadoLinhas.push(limpa);
    
    // Limitar tamanho
    if (enunciadoLinhas.join(' ').length > 1000) break;
  }
  
  return enunciadoLinhas.join(' ').substring(0, 1500);
}

/**
 * Busca resposta correta da questão
 */
function buscarRespostaCorreta(numero, conteudo, gabaritoGlobal, alternativas) {
  // 1. Verificar gabarito global primeiro
  if (gabaritoGlobal && gabaritoGlobal[numero]) {
    return gabaritoGlobal[numero];
  }
  
  // 2. Procurar no conteúdo da questão
  const padroes = [
    // Gabarito: A ou Resposta: A ou Resposta Correta: A
    /(?:Gabarito|Resposta|Resposta Correta|Resposta correta)[:\s]+([a-eA-E])\b/i,
    // Resposta: (A) ou (a)
    /(?:Resposta|Gabarito)[:\s]*\(?([a-eA-E])\)?/i,
    // Alternativa correta: A
    /(?:Alternativa correta|Alternativa correta)[:\s]+([a-eA-E])\b/i
  ];
  
  for (const padrao of padroes) {
    const match = conteudo.match(padrao);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  // 3. Inferir pela marcação de alternativa (negrito, itálico, etc.)
  // Procurar por padrões como "**A)**" ou "__A)__" ou "==A)=="
  const padroesMarcacao = [
    /\*\*([a-eA-E])\)[.\)]?\*\*/,
    /__([a-eA-E])\)[.\)]?__/,
    /==([a-eA-E])\)[.\)]?==/,
    /\[([a-eA-E])\)[.\)]?\]/
  ];
  
  for (const padrao of padroesMarcacao) {
    const match = conteudo.match(padrao);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return '';
}

/**
 * Fallback: extrair questões por blocos de alternativas
 */
function extrairPorBlocosAlternativas(texto) {
  const questoes = [];
  
  // Procurar por blocos que tenham A) B) C) D) ou mais
  const padraoBloco = /([\s\S]{50,1500}?)(?:\n\s*[a-eA-E]\s*[.\)]\s*[^\n]{2,}\n){2,}/gi;
  
  let match;
  let numero = 1;
  
  while ((match = padraoBloco.exec(texto)) !== null && numero <= 200) {
    const bloco = match[0];
    const alternativas = extrairAlternativasAprimorado(bloco);
    
    if (alternativas.length >= 2) {
      const enunciado = separarEnunciadoAprimorado(bloco, alternativas);
      
      questoes.push({
        id: `q_${Date.now()}_${numero}`,
        numero: String(numero),
        codigo: `Q${numero}`,
        enunciado: enunciado,
        alternativas: alternativas.map((texto, idx) => ({
          letra: String.fromCharCode(65 + idx),
          texto: texto.replace(/^[a-e][.\)]\s*/i, '').trim()
        })),
        respostaCorreta: '',
        disciplina: '',
        topico: '',
        fonte: '',
        dificuldade: 'media'
      });
      
      numero++;
    }
  }
  
  return questoes;
}

// Extrair alternativas - função legada mantida para compatibilidade
function extrairAlternativas(conteudo) {
  return extrairAlternativasAprimorado(conteudo);
}

// Separar enunciado - função legada mantida para compatibilidade
function separarEnunciado(conteudo, alternativas) {
  return separarEnunciadoAprimorado(conteudo, alternativas);
}

// Extrair metadados do conteúdo (disciplina, tópico, fonte)
function extrairMetadados(conteudo, alternativas) {
  let enunciado = separarEnunciado(conteudo, alternativas);
  let disciplina = '';
  let topico = '';
  let fonte = '';
  
  // Padrão: "Disciplinas/Assuntos vinculados:"
  const padraoDisciplina = /Disciplinas\/Assuntos\s*vinculados:\s*([^\n]+)/i;
  const matchDisciplina = conteudo.match(padraoDisciplina);
  
  if (matchDisciplina) {
    const linhaCompleta = matchDisciplina[1].trim();
    
    // Tentar extrair hierarquia: Disciplina > Tópico > Subtópico
    const partes = linhaCompleta.split('>').map(p => p.trim());
    
    if (partes.length >= 2) {
      disciplina = partes[0];
      topico = partes[1];
      if (partes.length >= 3) {
        topico += ' > ' + partes[2];
      }
    } else {
      disciplina = linhaCompleta;
    }
  }
  
  // Padrão: "Fonte:"
  const padraoFonte = /Fonte:\s*([^\n]+)/i;
  const matchFonte = conteudo.match(padraoFonte);
  
  if (matchFonte) {
    fonte = matchFonte[1].trim();
  }
  
  return { enunciado, disciplina, topico, fonte };
}

/**
 * Handler principal da API
 */
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder a preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido',
      message: 'Use POST para enviar PDFs'
    });
  }
  
  try {
    // Configurar busboy para parsing multipart
    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 4 * 1024 * 1024, // 4MB limite
        files: 1
      }
    });
    
    let pdfBuffer = null;
    let fileName = '';
    let erroArquivo = null;
    
    // Receber arquivo
    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      
      console.log(`📄 Recebendo arquivo: ${filename} (${mimeType})`);
      
      // Verificar tipo MIME
      if (mimeType !== 'application/pdf' && !filename.endsWith('.pdf')) {
        erroArquivo = 'Arquivo deve ser um PDF';
        file.resume(); // Descartar
        return;
      }
      
      fileName = filename;
      const chunks = [];
      
      file.on('data', (data) => {
        chunks.push(data);
      });
      
      file.on('end', () => {
        pdfBuffer = Buffer.concat(chunks);
        console.log(`✅ Arquivo recebido: ${pdfBuffer.length} bytes`);
      });
      
      file.on('limit', () => {
        erroArquivo = 'Arquivo excede 4MB';
      });
    });
    
    bb.on('error', (err) => {
      console.error('❌ Erro busboy:', err);
      erroArquivo = err.message;
    });
    
    // Aguardar parsing
    await new Promise((resolve, reject) => {
      bb.on('finish', resolve);
      bb.on('error', reject);
      req.pipe(bb);
    });
    
    // Verificar erros de arquivo
    if (erroArquivo) {
      return res.status(400).json({
        error: 'Erro no arquivo',
        message: erroArquivo
      });
    }
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(400).json({
        error: 'Requisição inválida',
        message: 'Nenhum PDF enviado ou arquivo vazio'
      });
    }
    
    // Processar PDF
    console.log('🔍 Processando PDF...');
    const pdfData = await pdfParse(pdfBuffer);
    const texto = pdfData.text;
    
    console.log(`📄 PDF processado: ${texto.length} caracteres`);
    console.log(`📝 Preview: ${texto.substring(0, 200)}...`);
    
    // Extrair questões
    const questoes = parseQuestoes(texto);
    
    console.log(`✅ ${questoes.length} questões extraídas`);
    
    // Retornar resultado
    return res.status(200).json({
      success: true,
      arquivo: fileName,
      totalPaginas: pdfData.numpages,
      totalQuestoes: questoes.length,
      questoes: questoes,
      preview: texto.substring(0, 500) // Primeiros 500 chars para debug
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
