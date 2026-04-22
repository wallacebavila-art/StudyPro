// Serviço Gemini - exatamente igual ao HTML
// Em DEV usa proxy, em produção usa URL direta
import { criarHistorico } from '../utils/dateUtils';

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

    console.log('🔷 [GEMINI] Iniciando extração de PDF...');
    
    // Converter para base64
    console.log('📄 Arquivo:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
    const b64 = await fileToBase64(file);
    console.log('📦 Base64 gerado:', b64.substring(0, 100) + '...', `(${b64.length} chars)`);

    const prompt = `Você é um extrator especializado em questões de concurso público brasileiro no formato GRAN Cursos Questões. Focado na Banca FGV e na metodologia de cobrança das questões em concursos.

EDITAL DE REFERÊNCIA - ANALISTA DE SEGURANÇA DA INFORMAÇÃO:
Você DEVE classificar cada questão usando EXATAMENTE uma das disciplinas do edital abaixo.

DISCIPLINAS DO EDITAL E SEUS TÓPICOS (classifique usando EXATAMENTE estes nomes e tópicos):

1. Segurança da Informação e Privacidade
   - Conceitos gerais de Segurança da Informação
   - LGPD (Lei Geral de Proteção de Dados)
   - Gestão de riscos (ISO 31000)
   - Classificação da informação
   - Políticas de segurança
   - Segurança física e lógica
   - Segurança em cloud
   - Continuidade do negócio (ISO 22301)

2. Gestão de Identidades e Acesso (IAM)
   - Autenticação multifatorial (MFA)
   - Single sign-on (SSO)
   - RBAC (Role-Based Access Control)
   - ABAC (Attribute-Based Access Control)
   - PAM (Privileged Access Management)

3. Firewalls e Proteção Perimetral
   - Firewalls tradicionais
   - NGFW (Next-Generation Firewall)
   - Zonas de segurança
   - DMZ (Demilitarized Zone)
   - Proxy
   - NAT (Network Address Translation)
   - Filtragem de tráfego
   - Controle de aplicações

4. Desenvolvimento Seguro (DevSecOps)
   - OWASP Top 10
   - SAST (Static Application Security Testing)
   - DAST (Dynamic Application Security Testing)
   - SDLC seguro (Secure Software Development Life Cycle)
   - Práticas de codificação segura
   - Ferramentas: Veracode, SonarQube, Checkmarx

5. Segurança em Redes e Resposta a Incidentes
   - DoS e DDoS
   - Spoofing
   - Phishing
   - XSS (Cross-Site Scripting)
   - CSRF (Cross-Site Request Forgery)
   - Wireshark
   - Gestão de vulnerabilidades
   - Threat intelligence
   - IOC (Indicators of Compromise)
   - TTP (Tactics, Techniques, and Procedures)
   - Resposta a incidentes (NIST SP 800-61 Rev. 3)

6. Criptografia e Certificação Digital
   - Criptografia simétrica (AES)
   - Criptografia assimétrica (RSA, ECC)
   - PKI (Public Key Infrastructure)
   - Certificados digitais
   - SSL/TLS
   - Hashes (SHA, bcrypt, HMAC)

7. Monitoramento e Observabilidade
   - Prometheus
   - Grafana
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Zabbix
   - Nagios
   - SIEM (Security Information and Event Management)
   - Análise de logs
   - Rastreamento de incidentes
   - Sniffers

8. Plano de Contingência e Recuperação de Desastres
   - BIA (Business Impact Analysis)
   - DRP (Disaster Recovery Plan)
   - Backups seguros
   - Testes de contingência
   - Análise de impacto
   - Estratégias de recuperação de serviços essenciais

9. Gestão da Qualidade e Indicadores de Performance
   - ISO 9001 em Segurança da Informação
   - OKRs (Objectives and Key Results)
   - KPIs (Key Performance Indicators) em ambientes críticos

10. Redes de Computadores
    - Modelo OSI
    - TCP/IP
    - MPLS (Multiprotocol Label Switching)
    - SD-WAN
    - VLANs (Virtual LANs)
    - Topologias de redes
    - Protocolos de comunicação
    - Segurança de redes sem fio (WPA2, EAP)

11. Laudos e Documentação Técnica
    - Estrutura de laudos técnicos
    - Pareceres técnicos
    - Documentação técnica em segurança da informação

12. Legislação e Aspectos Éticos
    - Ética Profissional em TI
    - Responsabilidade técnica
    - Sigilo profissional
    - Resolução Conjunta nº 3/2013
    - Contratação de TI
    - Lei nº 14.133/2021 (Lei de Licitações e Contratos)

FORMATO DAS QUESTÕES NESTE PDF:
1. Numeração: "1. [QXXXXXXX]" - número seguido de código entre colchetes
2. Enunciado: texto corrido que pode ter múltiplos parágrafos
3. Alternativas: letras minúsculas em negrito (a), b), c), d), e)) fechando com parêntese
4. Metadados no final de cada questão:
   - "Disciplinas/Assuntos vinculados:" com hierarquia (Disciplina > Tópico > Subtópico)
   - "Fonte:" com informações da prova (banca, ano, cargo, etc.)
5. NÃO há gabarito visível junto às questões

INSTRUÇÕES CRÍTICAS:
1. Analise TODO o PDF página por página - do início ao fim
2. Extraia ABSOLUTAMENTE TODAS as questões de múltipla escolha que encontrar
3. NÃO pare após algumas questões - processe TODAS as páginas até o final do documento
4. VERIFIQUE se há mais questões em cada página antes de concluir
5. Capture o enunciado COMPLETO (todos os parágrafos)
6. Capture todas as 5 alternativas (a, b, c, d, e)
7. CLASSIFIQUE CORRETAMENTE usando apenas as 12 disciplinas do EDITAL acima
8. Se não conseguir associar uma questão a nenhuma disciplina/tópico do edital, DEIXE "disciplina" e "topico" em BRANCO (string vazia "")

IMPORTANTE: Conte quantas questões existem no PDF e inclua TODAS no array JSON.
Não deixe nenhuma questão de fora - verifique página por página.

Para cada questão retorne um objeto JSON com:
- "enunciado": texto completo do enunciado (todos os parágrafos juntos)
- "alternativas": array [{"letra":"A","texto":"..."},{"letra":"B","texto":"..."},...] — LETRAS MAIÚSCULAS
- "gabarito": "" (deixar vazio, não há gabarito visível)
- "comentario": ""
- "disciplina": UMA das 12 disciplinas do EDITAL ou "" (vazio se não conseguir classificar)
- "topico": um dos tópicos listados acima ou "" (vazio se não conseguir classificar)
- "fonte": texto completo do campo "Fonte:" como aparece no PDF
- "banca": nome da banca examinadora (ex: "CESPE/CEBRASPE", "FGV", "VUNESP", "AOCP", etc.)
- "orgao": órgão ou empresa do concurso (ex: "Petrobras", "Banco do Brasil", "TRT", etc.)
- "ano": ano da prova (ex: "2022", "2023")
- "cargo": cargo/título do concurso (ex: "Analista de Sistemas - Área Infraestrutura", "Analista de Segurança da Informação")
- "prova": identificação da prova se houver (ex: "Prova 1", "Dia 1", "Tarde")
- "alerta": "" (vazio normalmente) ou "⚠️ QUESTÃO SEM CLASSIFICAÇÃO: Não foi possível associar esta questão a nenhuma disciplina ou tópico do edital. Requer revisão manual." (apenas quando disciplina e topico estiverem vazios)

IMPORTANTE:
- Use EXATAMENTE os nomes das disciplinas do edital listados acima
- Se a questão for de "Segurança da Informação" genérica, use "Segurança da Informação e Privacidade"
- CRÍTICO: Questões sobre LGPD (Lei Geral de Proteção de Dados) devem ser classificadas em "Segurança da Informação e Privacidade", NUNCA em "Legislação e Aspectos Éticos"
- CRÍTICO: Questões sobre ética profissional, sigilo, resolução conjunta 3/2013 ou Lei 14.133/2021 (licitações) devem ser classificadas em "Legislação e Aspectos Éticos"
- CRÍTICO: Se não conseguir classificar uma questão (ex: assunto fora do edital, questão ambígua), deixe "disciplina" e "topico" como "" (string vazia) e preencha o campo "alerta" com a mensagem de aviso
- NUNCA invente disciplinas ou tópicos fora do edital - prefira deixar em branco
- Retorne TODAS as questões em um único array JSON - não omita nenhuma questão do PDF
- Se houver 60 questões no PDF, retorne array com 60 objetos - NÃO retorne apenas 4 ou 5
- VERIFIQUE NOVAMENTE se extraiu todas as questões antes de finalizar
- NÃO use markdown (\\x60\\x60\\x60json) - retorne APENAS o JSON puro

Retorne SOMENTE o array JSON, sem formatação markdown. Comece imediatamente com [ e termine com ].`;

    const requestBody = {
      contents: [{ parts: [{ inline_data: { mime_type: 'application/pdf', data: b64 } }, { text: prompt }] }],
      generationConfig: { 
        temperature: 0.1, 
        maxOutputTokens: 262144,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    console.log('📤 [GEMINI] Enviando requisição...');
    console.log('🔗 URL:', API_URL.replace(apiKey, '***KEY***'));
    console.log('📝 Prompt (primeiros 200 chars):', prompt.substring(0, 200) + '...');
    console.log('⚙️ Config:', JSON.stringify(requestBody.generationConfig));

    const resp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [GEMINI] Resposta HTTP:', resp.status, resp.statusText);

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      console.error('❌ [GEMINI] Erro na resposta:', e);
      throw new Error(e?.error?.message || `Erro HTTP ${resp.status}`);
    }

    const data = await resp.json();
    console.log('📦 [GEMINI] Dados recebidos:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    const rawText = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    
    console.log('📝 [GEMINI] Texto bruto (primeiros 300 chars):', rawText.substring(0, 300));
    console.log('📏 [GEMINI] Tamanho total da resposta:', rawText.length, 'caracteres');
    
    if (!rawText) throw new Error('Gemini retornou resposta vazia.');

    // Extrair array JSON da resposta
    let questions;
    try {
      questions = tryParseJSON(rawText);
      console.log('📊 Gemini retornou', questions.length, 'questões');
      console.log('📏 Tamanho da resposta:', rawText.length, 'caracteres');
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e);
      console.error('📝 Texto recebido:', rawText.substring(0, 500));
      throw new Error('Resposta do Gemini não é um JSON válido. Tente novamente.');
    }

    if (!Array.isArray(questions)) {
      throw new Error('Resposta do Gemini não é um array de questões.');
    }

    // Normalizar questões - igual ao HTML
    const originalCount = questions.length;
    questions = questions.filter(q => q.enunciado && q.alternativas?.length).map(q => {
      const agora = new Date();
      return {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: agora.toISOString(),
        updatedAt: agora.toISOString(),
        enunciado: (q.enunciado || '').trim(),
        alternativas: (q.alternativas || []).map(a => ({
          letra: (a.letra || '').toUpperCase().trim(),
          texto: (a.texto || '').trim()
        })).filter(a => a.letra && a.texto),
        respostaCorreta: (q.gabarito || 'A').toUpperCase().trim().charAt(0),
        explicacao: (q.comentario || '').trim(),
        disciplina: q.disciplina || '',
        topico: q.topico || '',
        dificuldade: ['facil', 'media', 'dificil'].includes(q.dificuldade) ? q.dificuldade : 'media',
        fonte: (q.fonte || file.name || '').trim(),
        banca: (q.banca || '').trim(),
        orgao: (q.orgao || '').trim(),
        ano: (q.ano || '').trim(),
        cargo: (q.cargo || '').trim(),
        prova: (q.prova || '').trim(),
        geradoIA: true,
        historico: [
          criarHistorico('importacao', `Importada via Gemini de ${file.name || 'PDF'}`),
          criarHistorico('geracao', 'Gerada via Gemini')
        ]
      };
    });

    console.log(`✅ ${questions.length} de ${originalCount} questões são válidas após normalização`);

    if (questions.length === 0) {
      throw new Error('Nenhuma questão válida após normalização.');
    }

    return questions;
  },

  // Chamar Gemini com texto - igual ao HTML
  async callGemini(prompt, apiKey, maxTokens = 4096) {
    if (!apiKey) {
      throw new Error('Configure a API Key do Gemini em Configurações');
    }

    console.log('🔷 [GEMINI] callGemini - Iniciando...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    console.log('⚙️ maxTokens:', maxTokens);

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
    };

    console.log('📤 [GEMINI] Enviando requisição...');
    console.log('🔗 URL:', API_URL.replace(apiKey, '***KEY***'));

    const resp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [GEMINI] Resposta HTTP:', resp.status, resp.statusText);

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      console.error('❌ [GEMINI] Erro na resposta:', e);
      throw new Error(e?.error?.message || `Erro HTTP ${resp.status}`);
    }

    const data = await resp.json();
    console.log('📦 [GEMINI] Dados recebidos:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
    
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    console.log('📝 [GEMINI] Texto gerado:', text.substring(0, 150) + (text.length > 150 ? '...' : ''));
    
    if (!text) throw new Error('Gemini retornou resposta vazia.');
    console.log('✅ [GEMINI] callGemini - Concluído');
    return text;
  }
};

export default geminiService;
