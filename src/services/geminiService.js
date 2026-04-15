// Serviço para integração com Google Gemini API
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiService = {
  // Extrair questões de PDF usando Gemini
  async extractQuestionsFromPDF(file, apiKey) {
    if (!apiKey) {
      throw new Error('API Key do Gemini não configurada. Configure em Configurações.');
    }

    // Ler arquivo como base64
    const base64Content = await this.fileToBase64(file);

    const model = 'gemini-2.0-flash'; // Modelo que suporta PDF
    const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

    const prompt = `Analise este PDF e extraia todas as questões de múltipla escolha encontradas.

Para cada questão, retorne no seguinte formato JSON:
{
  "enunciado": "texto completo da questão",
  "alternativas": [
    {"letra": "A", "texto": "texto da alternativa A"},
    {"letra": "B", "texto": "texto da alternativa B"},
    {"letra": "C", "texto": "texto da alternativa C"},
    {"letra": "D", "texto": "texto da alternativa D"},
    {"letra": "E", "texto": "texto da alternativa E"}
  ],
  "respostaCorreta": "letra da alternativa correta (A, B, C, D ou E)",
  "disciplina": "disciplina da questão (ex: Matemática, Português, etc)",
  "topico": "tópico específico dentro da disciplina",
  "dificuldade": "facil|media|dificil",
  "fonte": "fonte da questão se disponível",
  "explicacao": "explicação da resposta correta se disponível no texto"
}

Retorne um array JSON com todas as questões encontradas:
[
  {questao1},
  {questao2},
  ...
]

Se não encontrar questões de múltipla escolha, retorne um array vazio [].`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: file.type || 'application/pdf',
                data: base64Content
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro na API Gemini: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      const questions = JSON.parse(jsonMatch[0]);
      return Array.isArray(questions) ? questions : [];
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      return [];
    }
  },

  // Converter arquivo para base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Verificar se API key é válida
  async validateApiKey(apiKey) {
    try {
      const url = `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test' }] }]
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default geminiService;
