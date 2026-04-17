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
 * Parser principal de questões - versão robusta
 * Extrai questões do texto usando padrões de concurso público
 */
function parseQuestoes(texto) {
  const questoes = [];
  console.log('📝 Texto recebido (primeiros 500 chars):', texto.substring(0, 500));
  
  // Limpar texto: normalizar espaços e quebras de linha
  const textoLimpo = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ');
  
  // Padrão 1: "1. [Q123456]" ou "1. [123456]"
  const padrao1 = /(\d+)\.\s*\[?Q?(\d+)\]?\s*\n?([\s\S]*?)(?=\n\s*\d+\.\s*\[?Q?\d*\]?|$)/gi;
  
  // Padrão 2: "1." ou "1)" seguido de texto
  const padrao2 = /(\d+)[.\)]\s*([\s\S]*?)(?=\n\s*\d+[.\)]|$)/gi;
  
  let match;
  let tentativas = 0;
  
  // Tentar padrão 1
  while ((match = padrao1.exec(textoLimpo)) !== null && tentativas < 100) {
    tentativas++;
    const numero = match[1];
    const codigo = match[2] || `Q${Date.now()}${tentativas}`;
    const conteudo = match[3].trim();
    
    console.log(`🔍 Questão ${numero}:`, conteudo.substring(0, 100));
    
    // Buscar alternativas
    const alternativas = extrairAlternativas(conteudo);
    
    if (alternativas.length >= 4) {
      const { enunciado, disciplina, topico, fonte } = extrairMetadados(conteudo, alternativas);
      
      questoes.push({
        numero: numero,
        codigo: codigo,
        enunciado: enunciado,
        alternativas: alternativas,
        disciplina: disciplina,
        topico: topico,
        fonte: fonte
      });
      console.log(`✅ Questão ${numero} extraída`);
    } else {
      console.log(`⚠️ Questão ${numero} ignorada: apenas ${alternativas.length} alternativas`);
    }
  }
  
  // Se não encontrou nada, tentar padrão 2
  if (questoes.length === 0) {
    console.log('🔄 Tentando padrão alternativo...');
    tentativas = 0;
    padrao2.lastIndex = 0;
    
    while ((match = padrao2.exec(textoLimpo)) !== null && tentativas < 100) {
      tentativas++;
      const numero = match[1];
      const conteudo = match[2].trim();
      
      const alternativas = extrairAlternativas(conteudo);
      
      if (alternativas.length >= 4) {
        const enunciado = separarEnunciado(conteudo, alternativas);
        
        questoes.push({
          numero: numero,
          codigo: `Q${Date.now()}${tentativas}`,
          enunciado: enunciado,
          alternativas: alternativas
        });
      }
    }
  }
  
  console.log(`📊 Total de questões encontradas: ${questoes.length}`);
  return questoes;
}

// Extrair alternativas de forma flexível - com espaço opcional
function extrairAlternativas(conteudo) {
  const alternativas = [];
  
  // Padrões comuns de alternativas - com espaço opcional entre letra e símbolo
  const padroes = [
    // a) ou a ) texto - suporta espaço entre letra e )
    /([a-e])\s*[.\)]\s*(.+?)(?=(?:\s+[a-e]\s*[.\)]\s)|(?:\n[a-e]\s*[.\)]\s)|$)/gi,
    // a. ou a . texto
    /([a-e])\s*\.\s*(.+?)(?=(?:\s+[a-e]\s*\.\s)|(?:\n[a-e]\s*\.\s)|$)/gi,
    // A) ou A ) texto
    /([a-e])\s*\)\s*(.+?)(?=(?:\s+[a-e]\s*\)\s)|(?:\n[a-e]\s*\)\s)|$)/gi
  ];
  
  for (const padrao of padroes) {
    const matches = [...conteudo.matchAll(padrao)];
    if (matches.length >= 4) {
      matches.forEach(m => {
        const letra = m[1].toLowerCase();
        const texto = m[2].replace(/\s+/g, ' ').trim();
        alternativas.push(`${letra}) ${texto}`);
      });
      break;
    }
  }
  
  // Fallback: procurar linha por linha - com espaço opcional
  if (alternativas.length < 4) {
    const linhas = conteudo.split('\n');
    const padraoLinha = /^\s*([a-e])\s*[.\)]\s*(.+)/i;
    
    for (const linha of linhas) {
      const match = linha.match(padraoLinha);
      if (match) {
        const letra = match[1].toLowerCase();
        if (!alternativas.some(a => a.startsWith(`${letra})`))) {
          alternativas.push(`${letra}) ${match[2].trim()}`);
        }
      }
    }
  }
  
  return alternativas;
}

// Separar enunciado do conteúdo
function separarEnunciado(conteudo, alternativas) {
  if (alternativas.length === 0) return conteudo;
  
  const primeiraAlt = alternativas[0];
  const letra = primeiraAlt.charAt(0);
  // Procurar com espaço opcional entre letra e símbolo
  const padraoBusca = new RegExp(`\\b${letra}\\s*[.\)]`, 'i');
  const match = conteudo.match(padraoBusca);
  
  if (match) {
    return conteudo.substring(0, match.index).trim();
  }
  
  return conteudo;
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
