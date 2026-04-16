// Serviço Gemini - exatamente igual ao HTML
// Em DEV usa proxy, em produção usa URL direta
import { EDITAL_ESTRUTURA, DISCIPLINAS, encontrarDisciplinaProxima } from '../config/editalConfig';

const API_URL = import.meta.env.DEV 
  ? '/api/gemini/v1beta/models/gemini-2.5-flash:generateContent'
  : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Converter arquivo para base64 - igual ao HTML
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Tentar extrair e completar JSON truncado
function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Tentar extrair array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e2) {
        // Tentar completar JSON truncado
        let fixed = arrayMatch[0];
        // Fechar objetos abertos
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        
        // Adicionar fechamentos faltantes
        for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
        
        try {
          return JSON.parse(fixed);
        } catch (e3) {
          throw e3;
        }
      }
    }
    throw e;
  }
}

export const geminiService = {
  // Extrair questões de PDF - exatamente igual ao HTML
  async extractQuestionsFromPDF(file, apiKey) {
    if (!apiKey) {
      throw new Error('Configure a API Key do Gemini em Configurações');
    }

    const b64 = await fileToBase64(file);
    
    const prompt = `Você é um extrator especializado em questões de concurso público brasileiro no formato GRAN Questões.

EDITAL DE REFERÊNCIA - ANALISTA DE SEGURANÇA DA INFORMAÇÃO CNMP/2025:
Você DEVE classificar cada questão usando EXATAMENTE uma das disciplinas do edital abaixo.

DISCIPLINAS DO EDITAL (use EXATAMENTE estes nomes):
1. Segurança da Informação e Privacidade
2. Gestão de Identidades e Acesso (IAM)
3. Firewalls e Proteção Perimetral
4. Desenvolvimento Seguro (DevSecOps)
5. Segurança em Redes e Resposta a Incidentes
6. Criptografia e Certificação Digital
7. Monitoramento e Observabilidade
8. Plano de Contingência e Recuperação de Desastres
9. Gestão da Qualidade e Indicadores de Performance
10. Redes de Computadores
11. Laudos e Documentação Técnica
12. Legislação e Aspectos Éticos

FORMATO DAS QUESTÕES NESTE PDF:
1. Numeração: "1. [QXXXXXXX]" - número seguido de código entre colchetes
2. Enunciado: texto corrido que pode ter múltiplos parágrafos
3. Alternativas: letras minúsculas em negrito (a), b), c), d), e)) fechando com parêntese
4. Metadados no final de cada questão:
   - "Disciplinas/Assuntos vinculados:" com hierarquia (Disciplina > Tópico > Subtópico)
   - "Fonte:" com informações da prova (banca, ano, cargo, etc.)
5. NÃO há gabarito visível junto às questões

INSTRUÇÕES CRÍTICAS:
1. Analise TODO o PDF página por página
2. Extraia ABSOLUTAMENTE TODAS as questões de múltipla escolha
3. NÃO pare após algumas questões - continue até o final
4. Capture o enunciado COMPLETO (todos os parágrafos)
5. Capture todas as 5 alternativas (a, b, c, d, e)
6. CLASSIFIQUE CORRETAMENTE usando apenas as 12 disciplinas do EDITAL CNMP acima

Para cada questão retorne um objeto JSON com:
- "enunciado": texto completo do enunciado (todos os parágrafos juntos)
- "alternativas": array [{"letra":"A","texto":"..."},{"letra":"B","texto":"..."},...] — LETRAS MAIÚSCULAS
- "gabarito": "" (deixar vazio, não há gabarito visível)
- "comentario": ""
- "disciplina": UMA das 12 disciplinas do EDITAL CNMP (ex: "Segurança da Informação e Privacidade")
- "topico": seja específico baseado no conteúdo (ex: "LGPD", "OWASP Top 10", "Firewall")
- "dificuldade": "media" (padrão)
- "fonte": extraia de "Fonte:" (ex: "EDUCA 2023 / Prefeitura de Pilões - PB")

IMPORTANTE: 
- Use EXATAMENTE os nomes das disciplinas do edital listados acima
- Se a questão for de "Segurança da Informação" genérica, use "Segurança da Informação e Privacidade"
- Retorne TODAS as questões em um único array JSON - não omita nenhuma questão do PDF
- NÃO invente disciplinas fora do edital
- Se houver 52 questões no PDF, retorne array com 52 objetos

Retorne SOMENTE o array JSON. Comece com [ e termine com ].`;

    const resp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: 'application/pdf', data: b64 } }, { text: prompt }] }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 65536,  // Aumentado para suportar PDFs grandes com muitas questões
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Erro HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const rawText = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    
    if (!rawText) throw new Error('Gemini retornou resposta vazia.');

    let questions;
    try {
      questions = tryParseJSON(rawText);
    } catch (pe) {
      console.error('Raw Gemini:', rawText);
      throw new Error('Não foi possível interpretar o JSON do Gemini. Ver console (F12).');
    }

    console.log(`📊 Gemini retornou ${questions?.length || 0} questões`);
    console.log(`📏 Tamanho da resposta: ${rawText.length} caracteres`);

    if (!Array.isArray(questions) || !questions.length) {
      throw new Error('Nenhuma questão encontrada no PDF.');
    }

    // Normalizar questões - igual ao HTML
    const originalCount = questions.length;
    questions = questions.filter(q => q.enunciado && q.alternativas?.length).map(q => ({
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      enunciado: (q.enunciado || '').trim(),
      alternativas: (q.alternativas || []).map(a => ({
        letra: (a.letra || '').toUpperCase().trim(),
        texto: (a.texto || '').trim()
      })).filter(a => a.letra && a.texto),
      respostaCorreta: (q.gabarito || 'A').toUpperCase().trim().charAt(0),
      explicacao: (q.comentario || '').trim(),
      disciplina: q.disciplina || 'Geral',
      topico: q.topico || '',
      dificuldade: ['facil', 'media', 'dificil'].includes(q.dificuldade) ? q.dificuldade : 'media',
      fonte: (q.fonte || file.name || '').trim(),
      geradoIA: true
    }));

    console.log(`✅ ${questions.length} de ${originalCount} questões são válidas após normalização`);

    if (!questions.length) {
      throw new Error('Nenhuma questão válida após normalização.');
    }

    return questions;
  },

  // Chamar Gemini com texto - igual ao HTML
  async callGemini(prompt, apiKey, maxTokens = 4096) {
    if (!apiKey) {
      throw new Error('Configure a API Key do Gemini em Configurações');
    }

    const resp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
      })
    });

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Erro HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) throw new Error('Gemini retornou resposta vazia.');
    return text;
  }
};

export default geminiService;
