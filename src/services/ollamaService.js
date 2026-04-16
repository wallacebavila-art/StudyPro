// Serviço para integração com Ollama (IA local)
const OLLAMA_DEFAULT_URL = 'http://localhost:11434';

export const ollamaService = {
  // Extrair questões de PDF usando Ollama
  async extractQuestionsFromPDF(file, config = {}) {
    const baseUrl = config.ollamaUrl || OLLAMA_DEFAULT_URL;
    const model = config.ollamaModel || 'llava'; // Modelo vision padrão

    // Verificar se Ollama está rodando
    const isRunning = await this.checkOllama(baseUrl);
    if (!isRunning) {
      throw new Error('Ollama não está rodando. Execute "ollama serve" no terminal.');
    }

    // Converter PDF para base64
    const base64Content = await this.fileToBase64(file);

    const prompt = `Analise esta imagem/PDF e extraia todas as questões de múltipla escolha encontradas.

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

Se não encontrar questões de múltipla escolha, retorne um array vazio [].

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;

    const requestBody = {
      model: model,
      prompt: prompt,
      images: [base64Content],
      stream: false,
      options: {
        temperature: 0.1,
        num_ctx: 4096
      }
    };

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no Ollama: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.response || '';

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Tentar encontrar JSON entre code blocks
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          const questions = JSON.parse(codeBlockMatch[1].trim());
          return Array.isArray(questions) ? questions : [];
        } catch (e) {
          console.error('Erro ao parsear JSON do code block:', e);
        }
      }
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

  // Verificar se Ollama está rodando
  async checkOllama(baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // Listar modelos disponíveis
  async listModels(baseUrl = OLLAMA_DEFAULT_URL) {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.models?.map(m => m.name) || [];
    } catch {
      return [];
    }
  },

  // Verificar se modelo vision está disponível
  async hasVisionModel(baseUrl = OLLAMA_DEFAULT_URL) {
    const models = await this.listModels(baseUrl);
    const visionModels = ['llava', 'bakllava', 'moondream', 'llama3.2-vision', 'llava-phi3'];
    return models.some(m => visionModels.some(vm => m.includes(vm)));
  },

  // Extrair questões de texto (alternativa mais leve ao PDF)
  async extractQuestionsFromText(textContent, config = {}) {
    const baseUrl = config.ollamaUrl || OLLAMA_DEFAULT_URL;
    const model = config.ollamaModel || 'llava';

    const isRunning = await this.checkOllama(baseUrl);
    if (!isRunning) {
      throw new Error('Ollama não está rodando. Execute "ollama serve" no terminal.');
    }

    // Limitar tamanho do texto
    const limitedText = textContent.slice(0, 15000);

    const prompt = `Analise este texto e extraia todas as questões de múltipla escolha encontradas.

TEXTO:
${limitedText}

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

Se não encontrar questões de múltipla escolha, retorne um array vazio [].

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;

    const requestBody = {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_ctx: 4096
      }
    };

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no Ollama: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.response || '';

    // Extrair JSON da resposta
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          const questions = JSON.parse(codeBlockMatch[1].trim());
          return Array.isArray(questions) ? questions : [];
        } catch (e) {
          console.error('Erro ao parsear JSON do code block:', e);
        }
      }
      return [];
    }

    try {
      const questions = JSON.parse(jsonMatch[0]);
      return Array.isArray(questions) ? questions : [];
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      return [];
    }
  }
};

export default ollamaService;
