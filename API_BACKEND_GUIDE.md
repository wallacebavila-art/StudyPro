# 🚀 Guia de Implementação - Backend Vercel Serverless

## ✅ O que foi implementado

### 📁 Estrutura de arquivos criada:

```
StudyPro/
├── api/                          # NOVO - Serverless functions
│   ├── package.json              # Dependências do backend
│   └── extrair-questoes.js       # Endpoint principal
├── src/
│   ├── services/
│   │   └── pdfApiService.js      # NOVO - Cliente da API
│   └── components/
│       └── Upload/
│           └── Upload.jsx        # MODIFICADO - Opção de 2 métodos
├── vercel.json                   # NOVO - Configuração Vercel
└── package.json                  # MODIFICADO - Dependências
```

---

## 🔧 Configuração do Projeto

### 1️⃣ Instalar dependências

```bash
# Na raiz do projeto
npm install

# Ou instalar especificamente
npm install pdf-parse busboy --save-dev
```

### 2️⃣ Testar localmente

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Agora acesse: http://localhost:5173
```

**Importante:** A API serverless só funciona no Vercel ou com `vercel dev`. Localmente (vite), ela usará o proxy interno.

---

## 📊 Comparativo dos Métodos

| Recurso | 🤖 Gemini | 🔍 Parser Local |
|---------|-----------|-----------------|
| **Qualidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Velocidade** | ⭐⭐ (lento) | ⭐⭐⭐⭐⭐ (instantâneo) |
| **Custo** | API Key necessária | Gratuito |
| **Limite PDF** | 20MB | 4MB |
| **Classificação** | Automática (12 disciplinas) | Manual (usuário edita) |
| **Detecção gabarito** | Sim (quando visível) | Não |
| **Cobertura** | Alta (IA inteligente) | Média (regex fixo) |

---

## 🌐 Deploy no Vercel

### Passo 1: Instalar CLI do Vercel

```bash
npm i -g vercel
```

### Passo 2: Login e Deploy

```bash
# Login (primeira vez)
vercel login

# Deploy
vercel

# Ou deploy direto para produção
vercel --prod
```

### Passo 3: Configurar variáveis de ambiente (se necessário)

No dashboard do Vercel:
1. Acesse seu projeto
2. Settings → Environment Variables
3. Adicione se necessário:
   - `NODE_ENV`: production

---

## 🧪 Testando a API

### Teste local com curl:

```bash
# Testar endpoint
curl -X POST http://localhost:3000/api/extrair-questoes \
  -F "pdf=@/caminho/para/seu/arquivo.pdf"
```

### Teste via JavaScript:

```javascript
const formData = new FormData();
formData.append('pdf', file);

fetch('/api/extrair-questoes', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 🔍 Debugging

### Logs no console do navegador:

```
🔷 [PDF-API] Iniciando upload para API...
📄 Arquivo: prova.pdf (245.3 KB)
📤 [PDF-API] Enviando para: /api/extrair-questoes
📥 [PDF-API] Resposta HTTP: 200 OK
📊 Resultado Parser Local: { total: 10, ... }
📝 Primeira questão: { id: "...", enunciado: "..." }
```

### Logs no Vercel (produção):

Acesse: Dashboard → Functions → Logs

---

## ⚠️ Limitações Conhecidas

### Parser Local:

1. **Regex limitado**: Pode falhar com PDFs de formatação muito diferente
2. **Sem classificação**: Não detecta disciplinas/tópicos automaticamente
3. **Limite 4MB**: Restrição do Vercel serverless
4. **Alternativas quebradas**: Pode ter dificuldade com alternativas em múltiplas linhas

### Quando usar cada método:

- **Use Gemini quando:**
  - PDF tem formatação complexa
  - Precisa de classificação automática
  - Arquivo > 4MB
  - Tem API Key disponível

- **Use Parser Local quando:**
  - PDF é simples e bem formatado
  - Arquivo < 4MB
  - Precisa de velocidade
  - Não tem API Key

---

## 🛠️ Manutenção futura

### Adicionar mais endpoints:

Crie novos arquivos em `/api/`:

```javascript
// api/outro-endpoint.js
export default async function handler(req, res) {
  // sua lógica aqui
}
```

### Aumentar limite de tamanho (pago):

No `vercel.json`, altere a config da função:

```json
{
  "functions": {
    "api/extrair-questoes.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

---

## 📞 Suporte

### Links úteis:

- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [busboy](https://www.npmjs.com/package/busboy)

---

**✨ Implementação concluída! Teste localmente e depois faça deploy no Vercel.**
