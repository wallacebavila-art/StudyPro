/**
 * Serviço para comunicação com API de extração de PDF (Vercel Serverless)
 * 
 * Fornece método alternativo ao Gemini para extrair questões de PDFs
 * usando parsing local com regex.
 */

const API_ENDPOINT = '/api/extrair-questoes';

export const pdfApiService = {
  /**
   * Extrair questões de PDF via API serverless
   * 
   * @param {File} file - Arquivo PDF
   * @returns {Promise<Array>} Array de questões extraídas
   * @throws {Error} Se falhar o processamento
   */
  async extractQuestionsFromPDF(file) {
    console.log('🔷 [PDF-API] Iniciando upload para API...');
    console.log('📄 Arquivo:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
    
    // Verificar limite de 4MB
    if (file.size > 4 * 1024 * 1024) {
      throw new Error('Arquivo excede 4MB. Use a opção Gemini para arquivos maiores.');
    }
    
    // Criar FormData
    const formData = new FormData();
    formData.append('pdf', file);
    
    console.log('📤 [PDF-API] Enviando para:', API_ENDPOINT);
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData
        // Não definir Content-Type - browser define automaticamente com boundary
      });
      
      console.log('📥 [PDF-API] Resposta HTTP:', response.status, response.statusText);
      
      // Verificar se resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ [PDF-API] Resposta não-JSON:', text.substring(0, 200));
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ [PDF-API] Erro:', data);
        throw new Error(data.message || `Erro HTTP ${response.status}`);
      }
      
      console.log('✅ [PDF-API] Sucesso:', data);
      console.log(`📊 ${data.totalQuestoes} questões extraídas de ${data.totalPaginas} páginas`);
      console.log('📝 Preview do PDF:', data.preview?.substring(0, 100) + '...');
      
      // Converter formato da API para formato interno do app
      const questoesConvertidas = this.converterFormato(data.questoes);
      
      return {
        success: true,
        total: data.totalQuestoes,
        arquivo: data.arquivo,
        paginas: data.totalPaginas,
        questoes: questoesConvertidas,
        raw: data
      };
      
    } catch (error) {
      console.error('❌ [PDF-API] Erro na requisição:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Não foi possível conectar à API. Verifique se está rodando localmente (npm run dev) ou se o deploy foi feito.');
      }
      
      throw error;
    }
  },
  
  /**
   * Converter formato da API para formato interno do StudyPro
   * Compatível com o formato usado pelo Gemini
   */
  converterFormato(questoesAPI) {
    if (!Array.isArray(questoesAPI)) {
      console.warn('⚠️ [PDF-API] Resposta não é array:', questoesAPI);
      return [];
    }
    
    return questoesAPI.map((q, index) => {
      // Parse alternativas de formato "a) texto" para objetos
      const alternativasParseadas = q.alternativas?.map(alt => {
        const match = alt.match(/^([a-e])\)\s*(.+)/i);
        if (match) {
          return {
            letra: match[1].toUpperCase(),
            texto: match[2].trim()
          };
        }
        // Fallback se formato não bater
        return {
          letra: 'A',
          texto: alt
        };
      }) || [];
      
      // Usar disciplina e tópico extraídos do PDF
      const disciplinaExtraida = q.disciplina || 'Geral';
      const topicoExtraido = q.topico || '';
      const fonteExtraida = q.fonte || `PDF - Questão ${q.numero}`;
      
      return {
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        enunciado: q.enunciado || '',
        alternativas: alternativasParseadas.length >= 4 
          ? alternativasParseadas 
          : [
              { letra: 'A', texto: 'Alternativa A' },
              { letra: 'B', texto: 'Alternativa B' },
              { letra: 'C', texto: 'Alternativa C' },
              { letra: 'D', texto: 'Alternativa D' }
            ],
        respostaCorreta: 'A', // Parser local não detecta gabarito
        explicacao: `Questão ${q.numero} (Código: ${q.codigo}) - Extraída via Parser Local`,
        disciplina: disciplinaExtraida,
        topico: topicoExtraido,
        dificuldade: 'media',
        fonte: fonteExtraida,
        geradoIA: false,
        // Metadados extras
        _numeroOriginal: q.numero,
        _codigoOriginal: q.codigo,
        _metodo: 'parser-local'
      };
    });
  },
  
  /**
   * Verificar se API está disponível (health check)
   */
  async verificarDisponibilidade() {
    try {
      const response = await fetch('/api/health', { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default pdfApiService;
