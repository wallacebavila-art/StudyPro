const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const geminiService = {
  async call(prompt, maxTokens = 4096, jsonMode = false) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Configure a API Key do Gemini em Configurações');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          responseMimeType: jsonMode ? 'application/json' : 'text/plain'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();

    if (!text) {
      throw new Error('Gemini retornou resposta vazia.');
    }

    return text;
  },

  async callText(prompt, maxTokens = 2048) {
    return this.call(prompt, maxTokens, false);
  },

  async callJSON(prompt, maxTokens = 4096) {
    const text = await this.call(prompt, maxTokens, true);
    return JSON.parse(text);
  }
};