// Serviço para extrair e parser textos de PDF localmente (sem Gemini)
// Usa abordagem de extração de texto via FileReader + parsing de PDF simplificado

// Extrair texto de PDF - lê como ArrayBuffer e converte para string
export const extractTextFromPDF = async (file) => {
  console.log('📄 [PDF Parser] Extraindo texto do PDF...');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Tentar múltiplas codificações
        let text = '';
        
        // 1. Tentar UTF-8
        try {
          text = new TextDecoder('utf-8').decode(uint8Array);
        } catch (e) {
          // 2. Tentar Latin-1
          try {
            text = new TextDecoder('iso-8859-1').decode(uint8Array);
          } catch (e2) {
            // 3. Fallback: converter byte a byte
            text = String.fromCharCode(...uint8Array);
          }
        }
        
        // Extrair texto legível do PDF
        const extractedText = extractReadableText(text);
        
        console.log(`📄 [PDF Parser] Texto extraído: ${extractedText.length} caracteres`);
        console.log(`📄 [PDF Parser] Primeiros 200 chars:`, extractedText.substring(0, 200));
        resolve(extractedText);
      } catch (err) {
        reject(new Error('Falha ao extrair texto do PDF: ' + err.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};

// Verificar se o texto extraído é legível (tem palavras reais)
const isReadableText = (text) => {
  // Contar quantas palavras comuns em português existem no texto
  const palavrasComuns = [' de ', ' da ', ' do ', ' a ', ' o ', ' e ', ' um ', ' uma ', ' para ', ' por ', ' com ', ' em ', ' que ', ' se ', ' os ', ' as ', ' no ', ' na ', ' ao ', ' aos '];
  const matches = palavrasComuns.filter(p => text.toLowerCase().includes(p));
  
  // Se tem pelo menos 5 palavras comuns, provavelmente é texto legível
  return matches.length >= 5;
};

// Extrair texto legível de conteúdo PDF bruto
const extractReadableText = (rawText) => {
  // Procurar por padrões comuns de texto em PDFs
  let text = rawText;
  
  // Método 1: Extrair texto entre parênteses (padrão PDF: (texto))
  // PDFs codificam texto assim: (A empresa de segurança...)
  const parenthesisMatches = text.match(/\(([A-Za-zÀ-ÿ][^)]+)\)/g);
  if (parenthesisMatches && parenthesisMatches.length > 20) {
    const extracted = parenthesisMatches
      .map(m => m.slice(1, -1)) // Remove parênteses
      .filter(t => {
        const trimmed = t.trim();
        return trimmed.length > 5 && 
               /[a-zA-ZÀ-ÿ]{3,}/.test(trimmed) && // Pelo menos 3 letras
               !/^[\d\s\W]+$/.test(trimmed);     // Não é só números/símbolos
      })
      .join('\n');
    
    if (extracted.length > 1000 && isReadableText(extracted)) {
      return cleanExtractedText(extracted);
    }
  }
  
  // Método 2: Procurar por padrões BT/ET (Begin Text/End Text) comuns em PDFs
  const btetMatches = text.match(/BT\s*[\s\S]*?ET/g);
  if (btetMatches) {
    const extracted = btetMatches
      .join(' ')
      .replace(/BT|ET|\/T[dfw]|\/[Ff]\d+|\/[Cc]m|\/[Ss]c|>>|<<|[\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (extracted.length > 1000 && isReadableText(extracted)) {
      return cleanExtractedText(extracted);
    }
  }
  
  // Método 3: Procurar strings legíveis no texto bruto
  // Encontrar sequências de caracteres que parecem texto
  const wordMatches = text.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.,;:!?()-]{10,500}/g);
  if (wordMatches && wordMatches.length > 0) {
    const extracted = wordMatches
      .filter(t => {
        const trimmed = t.trim();
        return trimmed.length > 20 && 
               trimmed.split(/\s+/).length > 3 && // Pelo menos 3 palavras
               /[a-zA-ZÀ-ÿ]/.test(trimmed);
      })
      .join('\n');
    
    if (extracted.length > 1000 && isReadableText(extracted)) {
      return cleanExtractedText(extracted);
    }
  }
  
  // Método 4: Procurar por streams de texto em PDF comprimido
  // Tentar encontrar padrões TJ, Tj (text showing operators)
  const tjMatches = text.match(/\)[TJj]\s*\(/g);
  if (tjMatches && tjMatches.length > 50) {
    // PDF comprimido com operadores de texto
    const extracted = text
      .replace(/\)[TJj]\s*\(/g, ' ')  // Junta textos adjacentes
      .replace(/[()]/g, '')           // Remove parênteses restantes
      .replace(/\\\n/g, '\n')         // Escapes de nova linha
      .replace(/\\/g, '')              // Remove escapes
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extracted.length > 1000 && isReadableText(extracted)) {
      return cleanExtractedText(extracted);
    }
  }
  
  // Verificar se conseguimos extrair texto legível
  const textoLimpo = cleanExtractedText(text);
  if (!isReadableText(textoLimpo)) {
    console.error('❌ [PDF Parser] Não foi possível extrair texto legível do PDF');
    console.error('❌ [PDF Parser] O PDF pode estar comprimido, criptografado ou ser uma imagem escaneada');
    console.error('❌ [PDF Parser] Amostra:', textoLimpo.substring(0, 100));
    throw new Error('PDF_COMPRIMIDO_OU_BINARIO');
  }
  
  return textoLimpo;
};

// Limpar texto extraído
const cleanExtractedText = (text) => {
  let cleaned = text
    // Escapes comuns
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    // Remover null bytes e caracteres de controle
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar espaços
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    // Normalizar múltiplas quebras de linha
    .replace(/\n{3,}/g, '\n\n');
  
  // Desquebrar linhas quebradas no meio de palavras/frases
  const antes = cleaned.split('\n').length;
  cleaned = unbreakLines(cleaned);
  const depois = cleaned.split('\n').length;
  
  if (depois < antes) {
    console.log(`🔧 [PDF Parser] Desquebradas ${antes - depois} linhas (quebras no meio de palavras)`);
  }
  
  return cleaned.trim();
};

// Desquebrar linhas quebradas no meio de palavras ou frases
const unbreakLines = (text) => {
  const lines = text.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length === 0) {
      result.push('');
      continue;
    }
    
    // Se a linha anterior terminou sem pontuação final
    // e a linha atual não começa com letra maiúscula, número ou marcador
    // provavelmente são parte da mesma frase
    if (result.length > 0) {
      const lastLine = result[result.length - 1];
      const lastChar = lastLine.slice(-1);
      const firstChar = line[0];
      
      // Verificar se linha anterior termina com pontuação final
      const endsWithPunctuation = /[.!?;:]$/.test(lastLine) || 
                                   /\[?Q\d+\]?$/.test(lastLine) ||  // termina com ID
                                   /\d+\.$/.test(lastLine);          // termina com número de questão
      
      // Verificar se linha atual começa com marcador especial
      const startsWithMarker = /^\d+\./.test(line) ||           // número de questão
                              /^\[?Q\d+\]?/.test(line) ||       // ID de questão
                              /^[a-e]\s*[).]/i.test(line) ||     // alternativa
                              /^(Disciplinas?|Fonte:|Gabarito:)/i.test(line) ||
                              /^[A-Z]/.test(line);               // começa com maiúscula (nova frase)
      
      // Se não tem pontuação final E não começa com marcador, juntar
      if (!endsWithPunctuation && !startsWithMarker && lastLine.length > 0) {
        result[result.length - 1] = lastLine + ' ' + line;
        continue;
      }
      
      // Caso especial: linha anterior termina com vírgula ou artigo/preposição
      const endsWithConnector = /[,]$/.test(lastLine) ||
                                /\s(de|da|do|das|dos|em|no|na|nos|nas|para|por|com|sem|sob|sobre|a|as|o|os|um|uma|uns|umas|e|ou|que|se|mas|porém|contudo|todavia)$/i.test(lastLine);
      
      if (endsWithConnector && !startsWithMarker) {
        result[result.length - 1] = lastLine + ' ' + line;
        continue;
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
};

// Parser de questão individual - mais flexível
// preciseMode: true = análise profunda (mais lento), false = análise rápida
const parseQuestaoIndividual = (bloco, numeroQuestao = null, preciseMode = true) => {
  console.log(` [PDF Parser] Parsing ${preciseMode ? '(preciso)' : '(rápido)'} bloco (${bloco.length} chars): ${bloco.substring(0, 80).replace(/\n/g, ' ')}...`);
  
  // Padrões de enunciado (do mais específico ao mais genérico)
  let enunciadoMatch = null;
  let questaoId = null;
  
  // Padrão 1: número. [QXXXXXXX] texto
  const padrao1 = bloco.match(/^(\d+)\.\s*\[?(Q\d+)\]?\s*(.+?)(?=\s+[a-e]\s*[)\.:]|$)/is);
  // Padrão 2: [QXXXXXXX] texto
  const padrao2 = bloco.match(/^\[?(Q\d+)\]?\s*(.+?)(?=\s+[a-e]\s*[)\.:]|$)/is);
  // Padrão 3: número. texto
  const padrao3 = bloco.match(/^(\d+)\.\s*(.+?)(?=\s+[a-e]\s*[)\.:]|$)/is);
  // Padrão 4: apenas texto começando com letra maiúscula
  const padrao4 = bloco.match(/^([A-Z][^.]{20,}?)(?=\s+[a-e]\s*[)\.:]|$)/is);
  
  console.log(` [PDF Parser] Padrões: 1=${!!padrao1}, 2=${!!padrao2}, 3=${!!padrao3}, 4=${!!padrao4}`);
  
  if (padrao1) {
    numeroQuestao = padrao1[1];
    questaoId = padrao1[2];
    enunciadoMatch = { enunciado: padrao1[3].trim() };
  } else if (padrao2) {
    questaoId = padrao2[1];
    enunciadoMatch = { enunciado: padrao2[2].trim() };
  } else if (padrao3) {
    numeroQuestao = padrao3[1];
    enunciadoMatch = { enunciado: padrao3[2].trim() };
  } else if (padrao4) {
    enunciadoMatch = { enunciado: padrao4[1].trim() };
  }
  
  if (!enunciadoMatch || enunciadoMatch.enunciado.length < 10) {
    return null;
  }

  const enunciado = unbreakLines(enunciadoMatch.enunciado)
    .replace(/\n/g, ' ')  // Remover todas as quebras restantes no enunciado
    .replace(/\s+/g, ' ')
    .trim();

  // Extrair alternativas
  const alternativas = [];
  const letras = ['a', 'b', 'c', 'd', 'e'];
  
  // ========== MODO RÁPIDO: Apenas método simples ==========
  if (!preciseMode) {
    const linhas = bloco.split('\n');
    for (const linha of linhas) {
      const match = linha.trim().match(/^([a-e])\s*[).]\s*(.+)/i);
      if (match) {
        const letra = match[1].toUpperCase();
        const texto = match[2].trim();
        if (texto.length > 3 && !alternativas.find(a => a.letra === letra)) {
          alternativas.push({ letra, texto });
        }
      }
    }
    console.log(`🔍 [PDF Parser] Modo rápido: ${alternativas.length} alternativas`);
  } else {
  
  // ========== MODO PRECISO: Análise profunda ==========
  
  // MÉTODO 1: Análise linha por linha com concatenação
  const linhas = bloco.split('\n');
  const linhasComConteudo = linhas.map((l, i) => ({ 
    texto: l.trim(), 
    index: i,
    matchAlt: l.trim().match(/^([a-e])\s*[).]\s*(.+)/i)
  })).filter(l => l.texto.length > 0);
  
  // Procurar padrão sequencial a->b->c->d->e
  for (let i = 0; i < linhasComConteudo.length; i++) {
    const linha = linhasComConteudo[i];
    if (linha.matchAlt) {
      const letra = linha.matchAlt[1].toUpperCase();
      let texto = linha.matchAlt[2].trim();
      
      // Se a linha termina com vírgula ou é muito curta, juntar com próximas linhas
      let j = i + 1;
      while (j < linhasComConteudo.length && 
             !linhasComConteudo[j].matchAlt && 
             texto.length < 800 &&
             !linhasComConteudo[j].texto.match(/^(Disciplinas?|Fonte:|Gabarito:)/i)) {
        texto += ' ' + linhasComConteudo[j].texto;
        j++;
      }
      
      // Limpar texto
      texto = texto
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 800);
      
      if (texto.length > 3 && !alternativas.find(a => a.letra === letra)) {
        alternativas.push({ letra, texto });
      }
    }
  }
  
  console.log(`🔍 [PDF Parser] Método 1 (linha por linha): ${alternativas.length} alternativas`);
  
  // ========== MÉTODO 2: Regex por seções (padrões FGV) ==========
  if (alternativas.length < 3) {
    // Padrão: letra + ) ou . + texto até próxima letra ou palavra-chave
    const padroesFGV = [
      // Padrão FGV: "a) texto b) texto c) texto..."
      /([a-e])\s*\)\s*([^\n]*?)(?=(?:[a-e]\s*\)|Disciplinas?|Fonte:|Gabarito:|$))/gis,
      // Padrão: "a) texto\nb) texto\n..."
      /([a-e])\s*\)\s*([^\n]+)/gi,
      // Padrão com ponto: "a. texto b. texto..."
      /([a-e])\s*\.\s*([^\n]*?)(?=(?:[a-e]\s*\.|Disciplinas?|Fonte:|Gabarito:|$))/gis,
    ];
    
    for (const regex of padroesFGV) {
      const matches = [...bloco.matchAll(regex)];
      for (const match of matches) {
        const letra = match[1].toUpperCase();
        let texto = match[2].trim().replace(/\n/g, ' ');
        
        // Limpar se pegou texto demais
        const proximaLetra = new RegExp(`\\s*[${letras.filter(l => l !== letra.toLowerCase()).join('')}]\\s*[).]`, 'i');
        const corte = texto.search(proximaLetra);
        if (corte > 10) {
          texto = texto.substring(0, corte).trim();
        }
        
        if (texto.length > 3 && texto.length < 800 && !alternativas.find(a => a.letra === letra)) {
          alternativas.push({ letra, texto });
        }
      }
    }
    
    console.log(`🔍 [PDF Parser] Método 2 (padrões FGV): ${alternativas.length} alternativas`);
  }
  
  // ========== MÉTODO 3: Busca por contexto (encontrar alternativas espalhadas) ==========
  if (alternativas.length < 2) {
    // Normalizar espaços e buscar padrões
    const blocoNormalizado = bloco.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    
    for (const letra of letras) {
      // Buscar padrões: " a) texto " ou " a ) texto "
      const regex = new RegExp(`\\s${letra}\\s*\\)\\s*([^${letras.filter(l => l !== letra).join('')}]{10,}?)(?=\\s[${letras.filter(l => l !== letra).join('')}][)\\.]|Disciplinas?|Fonte:|Gabarito:|$)`, 'i');
      const match = blocoNormalizado.match(regex);
      
      if (match) {
        const texto = match[1].trim().substring(0, 800);
        if (texto.length > 3 && !alternativas.find(a => a.letra === letra.toUpperCase())) {
          alternativas.push({ letra: letra.toUpperCase(), texto });
        }
      }
    }
    
    console.log(`🔍 [PDF Parser] Método 3 (busca por contexto): ${alternativas.length} alternativas`);
  }
  
  // ========== MÉTODO 4: Correção e reconstrução ==========
  if (alternativas.length >= 2 && alternativas.length < 5) {
    // Se tem algumas alternativas mas não todas, tentar reconstruir
    const letrasEncontradas = alternativas.map(a => a.letra);
    const letrasFaltantes = ['A', 'B', 'C', 'D', 'E'].filter(l => !letrasEncontradas.includes(l));
    
    // Tentar encontrar as alternativas faltantes com busca mais profunda
    for (const letra of letrasFaltantes) {
      const letraLower = letra.toLowerCase();
      // Buscar qualquer ocorrência da letra seguida de ) ou .
      const regexFlex = new RegExp(`${letraLower}\\s*[).]\\s*(.{20,800}?)(?=\\s|Disciplinas?|Fonte:|Gabarito:|$)`, 'i');
      const match = bloco.match(regexFlex);
      if (match) {
        const texto = match[1].trim();
        if (texto.length > 3) {
          alternativas.push({ letra, texto });
          console.log(`🔧 [PDF Parser] Alternativa ${letra} reconstruída`);
        }
      }
    }
  }
  
  } // Fim do if (preciseMode)

  // Limpar quebras de linha nas alternativas
  for (const alt of alternativas) {
    alt.texto = alt.texto
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Ordenar alternativas A-E
  alternativas.sort((a, b) => a.letra.localeCompare(b.letra));

  console.log(`🔍 [PDF Parser] Total alternativas: ${alternativas.length} (${alternativas.map(a => a.letra).join(', ')})`);

  // Verificar se tem alternativas suficientes (aceita mínimo 2 para casos especiais)
  if (alternativas.length < 2) {
    console.log('❌ [PDF Parser] Poucas alternativas encontradas, ignorando questão');
    return null;
  }

  // Extrair disciplina/tópico
  const disciplinaMatch = bloco.match(/Disciplinas?\/Assuntos?\s*vinculados?:?\s*(.+?)(?=Fonte:|Gabarito:|Questão|\d+\.|$)/is);
  let disciplina = '';
  let topico = '';
  
  if (disciplinaMatch) {
    const linha = disciplinaMatch[1].trim().replace(/\s+/g, ' ');
    const partes = linha.split(/>/).map(p => p.trim());
    disciplina = partes[0] || '';
    topico = partes.slice(1).join(' > ') || '';
  }

  // Extrair fonte
  const fonteMatch = bloco.match(/Fonte:\s*(.+?)(?=Gabarito:|Questão|\d+\.|$)/i);
  const fonte = fonteMatch ? fonteMatch[1].trim().replace(/\s+/g, ' ') : '';

  // Extrair gabarito (se existir)
  const gabaritoMatch = bloco.match(/Gabarito:\s*([a-e])/i);
  const respostaCorreta = gabaritoMatch ? gabaritoMatch[1].toUpperCase() : '';

  // Parse da fonte
  const parsedFonte = parseFonte(fonte);

  // Criar ID único
  const idBase = questaoId || numeroQuestao || Date.now().toString();

  return {
    id: `q_${idBase}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    enunciado: questaoId ? `[${questaoId}] ${enunciado}` : (numeroQuestao ? `[Q${numeroQuestao}] ${enunciado}` : enunciado),
    alternativas,
    respostaCorreta,
    disciplina: normalizarDisciplina(disciplina),
    topico,
    explicacao: '',
    fonte: parsedFonte.textoCompleto || fonte,
    banca: parsedFonte.banca,
    orgao: parsedFonte.orgao,
    ano: parsedFonte.ano,
    cargo: parsedFonte.cargo,
    geradoIA: true,
    _parser: 'local'
  };
};

// Parse da linha de fonte
const parseFonte = (fonte) => {
  if (!fonte) return {};

  const resultado = { textoCompleto: fonte };

  // Bancas conhecidas
  const bancas = ['FGV', 'CESPE', 'CEBRASPE', 'VUNESP', 'AOCP', 'FCC', 'IBFC', 'QUADRIX', 'IBADE', 'IDECAN'];
  for (const b of bancas) {
    if (fonte.toUpperCase().includes(b)) {
      resultado.banca = b === 'CESPE' ? 'CESPE/CEBRASPE' : b;
      break;
    }
  }

  // Ano
  const anoMatch = fonte.match(/\b(19\d{2}|20\d{2})\b/);
  if (anoMatch) resultado.ano = anoMatch[1];

  // Órgão
  const orgaoMatch = fonte.match(/\d{4}\s*\/\s*([^/]+)/);
  if (orgaoMatch) resultado.orgao = orgaoMatch[1].trim();

  // Cargo
  const cargoMatch = fonte.match(/Analista[^/]+|Técnico[^/]+|Assistente[^/]+|Auditor[^/]+/i);
  if (cargoMatch) resultado.cargo = cargoMatch[0].trim();

  return resultado;
};

// Normalizar nome de disciplina
const normalizarDisciplina = (disciplina) => {
  if (!disciplina) return '';
  
  const mapa = {
    'tecnologia da informação': 'Tecnologia da Informação',
    'tecnologia da informacao': 'Tecnologia da Informação',
    'segurança da informação': 'Segurança da Informação',
    'seguranca da informacao': 'Segurança da Informação',
    'lgpd': 'Tecnologia da Informação',
    'lei geral de proteção de dados': 'Tecnologia da Informação',
    'direito constitucional': 'Direito Constitucional',
    'direito administrativo': 'Direito Administrativo',
    'português': 'Língua Portuguesa',
    'portugues': 'Língua Portuguesa',
    'língua portuguesa': 'Língua Portuguesa',
    'lingua portuguesa': 'Língua Portuguesa',
    'raciocínio lógico': 'Raciocínio Lógico',
    'raciocinio logico': 'Raciocínio Lógico'
  };
  
  const normalizada = disciplina.toLowerCase().trim();
  return mapa[normalizada] || disciplina;
};

// Parser principal - extrai múltiplas questões do texto
// preciseMode: true = análise mais lenta e profunda, false = análise rápida
export const parseQuestoesFromText = (texto, preciseMode = true) => {
  console.log(`🔍 [PDF Parser] Iniciando parsing ${preciseMode ? '(MODO PRECISO)' : '(modo rápido)'}...`);
  console.log(`🔍 [PDF Parser] Texto tem ${texto.length} caracteres`);
  
  const questoes = [];
  
  // Limpar texto
  const textoLimpo = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  // Método 1: Split por padrão de número de questão
  // Procurar por "1." "2." etc. seguido de texto
  const padraoQuestao = /(?:^|\n)\s*(\d+)\s*\.\s*(?=\[?Q?\d*\]?|\w)/g;
  const matches = [...textoLimpo.matchAll(padraoQuestao)];
  
  console.log(`🔍 [PDF Parser] ${matches.length} números de questão encontrados`);
  
  let blocosIgnorados = 0;
  let blocosPequenos = 0;
  let blocosSemAlternativas = 0;
  
  // Array para tracking de questões ignoradas com detalhes
  const questoesIgnoradas = [];
  
  if (matches.length > 0) {
    // Extrair blocos baseado nas posições dos matches
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const numQuestao = match[1];
      const startPos = match.index;
      const endPos = i < matches.length - 1 ? matches[i + 1].index : textoLimpo.length;
      const bloco = textoLimpo.substring(startPos, endPos).trim();
      
      // Extrair ID da questão se existir [QXXXXXX]
      const idMatch = bloco.match(/\[?(Q\d+)\]?/);
      const questaoId = idMatch ? idMatch[1] : null;
      
      // Contar linhas aproximadas para estimar página (assumindo ~40 linhas por página)
      const linhasAteAqui = textoLimpo.substring(0, startPos).split('\n').length;
      const paginaEstimada = Math.ceil(linhasAteAqui / 40);
      
      if (bloco.length <= 50) {
        blocosPequenos++;
        questoesIgnoradas.push({
          numero: numQuestao,
          id: questaoId,
          pagina: paginaEstimada,
          motivo: 'Bloco muito pequeno (possível fragmento)',
          amostra: bloco.substring(0, 100)
        });
        console.log(`⚠️ [PDF Parser] Questão ${numQuestao} ignorada: muito pequena (${bloco.length} chars)`);
        continue;
      }
      
      console.log(`🔍 [PDF Parser] Processando questão ${numQuestao}: ${bloco.substring(0, 50).replace(/\n/g, ' ')}... (${bloco.length} chars)`);
      
      const questao = parseQuestaoIndividual(bloco, numQuestao, preciseMode);
      if (questao) {
        questoes.push(questao);
        console.log(`✅ [PDF Parser] Questão ${numQuestao} extraída com sucesso`);
      } else {
        blocosSemAlternativas++;
        // Tentar extrazer enunciado para mostrar na amostra
        const enunciadoMatch = bloco.match(/^\d+\.\s*(?:\[?Q\d+\]?)?\s*(.+?)(?=\n\s*[a-e]\s*[).]|$)/is);
        const enunciado = enunciadoMatch ? enunciadoMatch[1].substring(0, 80) : bloco.substring(0, 80);
        
        questoesIgnoradas.push({
          numero: numQuestao,
          id: questaoId,
          pagina: paginaEstimada,
          motivo: 'Sem alternativas no formato esperado (a), b), c)... )',
          amostra: enunciado
        });
        
        console.log(`❌ [PDF Parser] Questão ${numQuestao} ignorada: não conseguiu extrair alternativas`);
        console.log(`   Amostra: ${bloco.substring(0, 150).replace(/\n/g, ' | ')}...`);
      }
    }
    
    console.log(`📊 [PDF Parser] Resumo: ${questoes.length} questões extraídas, ${blocosPequenos} muito pequenos, ${blocosSemAlternativas} sem alternativas`);
    console.log(`📋 [PDF Parser] Questões ignoradas:`, questoesIgnoradas);
  } else {
    // Método 2: Tentar encontrar padrões alternativos
    // Procurar por padrões de questão sem numeração clara
    const padraoAlternativo = /(?:^|\n)\s*(?:\[?Q(\d+)\]?)?\s*([A-Z][A-Za-z\s]{30,500}?)(?=\s+[a-e]\s*[)\.:]|$)/g;
    const altMatches = [...textoLimpo.matchAll(padraoAlternativo)];
    
    console.log(`🔍 [PDF Parser] ${altMatches.length} padrões alternativos encontrados`);
    
    for (const match of altMatches) {
      const bloco = match[0].trim();
      if (bloco.length > 50) {
        const questao = parseQuestaoIndividual(bloco, match[1], preciseMode);
        if (questao && !questoes.find(q => q.enunciado === questao.enunciado)) {
          questoes.push(questao);
        }
      }
    }
  }
  
  // Método 3: Se ainda não encontrou, tentar dividir por "Disciplinas/Assuntos" ou "Fonte"
  if (questoes.length === 0) {
    console.log('🔍 [PDF Parser] Tentando método 3: split por metadados...');
    const padraoMetadados = /(?:^|\n)(?=Disciplinas?\/Assuntos?|Fonte:|Gabarito:)/g;
    const metaMatches = textoLimpo.split(padraoMetadados).filter(b => b.trim().length > 50);
    
    for (const bloco of metaMatches) {
      const questao = parseQuestaoIndividual(bloco, null, preciseMode);
      if (questao && !questoes.find(q => q.enunciado === questao.enunciado)) {
        questoes.push(questao);
      }
    }
  }
  
  console.log(`🔍 [PDF Parser] Total de questões parseadas: ${questoes.length}`);
  
  // Criar relatório de problemas
  const report = {
    totalEncontrados: matches.length,
    extraidos: questoes.length,
    ignorados: matches.length - questoes.length,
    motivos: {
      pequenos: blocosPequenos,
      semAlternativas: blocosSemAlternativas
    },
    questoesIgnoradas: questoesIgnoradas,
    alerta: null
  };
  
  // Gerar alerta se houver problemas significativos
  if (report.ignorados > 0) {
    const percentual = Math.round((report.ignorados / report.totalEncontrados) * 100);
    
    if (percentual > 20) {
      report.alerta = `⚠️ ATENÇÃO: ${report.ignorados} de ${report.totalEncontrados} questões (${percentual}%) não puderam ser extraídas.\n\n` +
        `Possíveis causas:\n` +
        `• ${report.motivos.semAlternativas} questões sem alternativas no formato esperado (a), b), c)... )\n` +
        `• ${report.motivos.pequenos} blocos muito pequenos (possíveis fragmentos)\n\n` +
        `💡 Recomendação: Verifique se o formato das questões está correto ou use o modo "Gemini IA" para melhor precisão.`;
    } else if (report.ignorados > 0) {
      report.alerta = `ℹ️ ${report.ignorados} questão(ões) não extraída(s). ${report.motivos.semAlternativas} por formato de alternativas incorreto.`;
    }
  }
  
  return { questoes, report };
};

// Wrapper que retorna apenas questões para compatibilidade
export const parseQuestoesFromTextOnly = (texto, preciseMode = true) => {
  const result = parseQuestoesFromText(texto, preciseMode);
  return result.questoes;
};

// Função principal: extrair texto e parsear questões
export const extractAndParsePDF = async (file, preciseMode = true) => {
  try {
    const texto = await extractTextFromPDF(file);
    const { questoes, report } = parseQuestoesFromText(texto, preciseMode);
    
    // Se houver alerta significativo, logar no console
    if (report.alerta && report.ignorados > 5) {
      console.warn('📋 [PDF Parser] Relatório de extração:', report);
    }
    
    return { questoes, report };
  } catch (error) {
    console.error('❌ [PDF Parser] Erro:', error);
    throw new Error(`Erro ao processar PDF: ${error.message}`);
  }
};

export const pdfParserService = {
  extractTextFromPDF,
  parseQuestoesFromText: parseQuestoesFromTextOnly,
  parseQuestoesFromTextWithReport: parseQuestoesFromText,
  extractAndParsePDF
};

export default pdfParserService;
