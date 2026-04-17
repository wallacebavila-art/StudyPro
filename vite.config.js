import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import busboy from 'busboy'
import pdfParse from 'pdf-parse'

// Plugin para simular API serverless no desenvolvimento
function vercelApiPlugin() {
  return {
    name: 'vercel-api',
    configureServer(server) {
      server.middlewares.use('/api/extrair-questoes', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Método não permitido' }))
          return
        }
        
        // Parse multipart
        const bb = busboy({ headers: req.headers })
        let pdfBuffer = null
        let fileName = ''
        
        bb.on('file', (name, file, info) => {
          const chunks = []
          file.on('data', (data) => chunks.push(data))
          file.on('end', () => {
            pdfBuffer = Buffer.concat(chunks)
            fileName = info.filename
          })
        })
        
        bb.on('finish', async () => {
          try {
            if (!pdfBuffer) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Nenhum PDF enviado' }))
              return
            }
            
            // Processar PDF
            const pdfData = await pdfParse(pdfBuffer)
            const texto = pdfData.text
            
            // Parser simples (mesmo do backend)
            const questoes = parseQuestoes(texto)
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              arquivo: fileName,
              totalPaginas: pdfData.numpages,
              totalQuestoes: questoes.length,
              questoes: questoes,
              preview: texto.substring(0, 500)
            }))
          } catch (error) {
            console.error('Erro API:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: error.message }))
          }
        })
        
        req.pipe(bb)
      })
    }
  }
}

// Parser de questões - versão robusta
function parseQuestoes(texto) {
  const questoes = []
  console.log('═══════════════════════════════════════════════════')
  console.log('📝 TEXTO COMPLETO DO PDF:')
  console.log('═══════════════════════════════════════════════════')
  console.log(texto)
  console.log('═══════════════════════════════════════════════════')
  console.log(`📏 Tamanho total: ${texto.length} caracteres`)
  
  // Limpar texto: normalizar espaços e quebras de linha
  const textoLimpo = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
  
  // Padrão 1: "1. [Q123456]" ou "1. [123456]"
  const padrao1 = /(\d+)\.\s*\[?Q?(\d+)\]?\s*\n?([\s\S]*?)(?=\n\s*\d+\.\s*\[?Q?\d*\]?|$)/gi
  
  // Padrão 2: "1." ou "1)" seguido de texto
  const padrao2 = /(\d+)[.\)]\s*([\s\S]*?)(?=\n\s*\d+[.\)]|$)/gi
  
  let match
  let tentativas = 0
  
  // Tentar padrão 1
  while ((match = padrao1.exec(textoLimpo)) !== null && tentativas < 100) {
    tentativas++
    const numero = match[1]
    const codigo = match[2] || `Q${Date.now()}${tentativas}`
    const conteudo = match[3].trim()
    
    console.log(`\n🔍 Questão ${numero}:`)
    console.log('📄 Conteúdo completo:', conteudo)
    console.log('📏 Tamanho:', conteudo.length, 'caracteres')
    
    // Buscar alternativas com padrão mais flexível
    const alternativas = extrairAlternativas(conteudo)
    
    console.log(`📝 Alternativas encontradas:`, alternativas)
    
    if (alternativas.length >= 4) {
      const { enunciado, disciplina, topico, fonte } = extrairMetadados(conteudo, alternativas)
      
      questoes.push({
        numero: numero,
        codigo: codigo,
        enunciado: enunciado,
        alternativas: alternativas,
        disciplina: disciplina,
        topico: topico,
        fonte: fonte
      })
      console.log(`✅ Questão ${numero} extraída`)
      console.log(`   📚 Disciplina: ${disciplina || 'N/A'}`)
      console.log(`   📖 Tópico: ${topico || 'N/A'}`)
      console.log(`   📰 Fonte: ${fonte || 'N/A'}`)
    } else {
      console.log(`⚠️ Questão ${numero} ignorada: ${alternativas.length} alternativas (precisa de 4+)`)
    }
  }
  
  // Se não encontrou nada, tentar padrão 2
  if (questoes.length === 0) {
    console.log('🔄 Tentando padrão alternativo...')
    tentativas = 0
    padrao2.lastIndex = 0
    
    while ((match = padrao2.exec(textoLimpo)) !== null && tentativas < 100) {
      tentativas++
      const numero = match[1]
      const conteudo = match[2].trim()
      
      const alternativas = extrairAlternativas(conteudo)
      
      if (alternativas.length >= 4) {
        const enunciado = separarEnunciado(conteudo, alternativas)
        
        questoes.push({
          numero: numero,
          codigo: `Q${Date.now()}${tentativas}`,
          enunciado: enunciado,
          alternativas: alternativas
        })
      }
    }
  }
  
  console.log(`📊 RESUMO:`)
  console.log(`   Tentativas de extração: ${tentativas}`)
  console.log(`   Questões válidas (com 4+ alternativas): ${questoes.length}`)
  console.log(`   Taxa de sucesso: ${questoes.length > 0 ? Math.round((questoes.length/tentativas)*100) : 0}%`)
  
  if (questoes.length === 0 && tentativas > 0) {
    console.log('⚠️ Nenhuma questão válida encontrada!')
    console.log('💡 Possíveis causas:')
    console.log('   - Alternativas em formato diferente de a), b), c), d), e)')
    console.log('   - Questões com menos de 4 alternativas')
    console.log('   - Texto do PDF não contém alternativas identificáveis')
  }
  
  return questoes
}

// Extrair alternativas de forma flexível
function extrairAlternativas(conteudo) {
  const alternativas = []
  
  console.log('🔎 Procurando alternativas no conteúdo...')
  console.log('📝 Primeiras 200 chars:', conteudo.substring(0, 200))
  
  // Padrões comuns de alternativas - com espaço opcional entre letra e símbolo
  const padroes = [
    // a) ou a ) texto - suporta espaço entre letra e )
    /([a-e])\s*[.\)]\s*(.+?)(?=(?:\s+[a-e]\s*[.\)]\s)|(?:\n[a-e]\s*[.\)]\s)|$)/gi,
    // a. ou a . texto
    /([a-e])\s*\.\s*(.+?)(?=(?:\s+[a-e]\s*\.\s)|(?:\n[a-e]\s*\.\s)|$)/gi,
    // A) ou A ) texto
    /([a-e])\s*\)\s*(.+?)(?=(?:\s+[a-e]\s*\)\s)|(?:\n[a-e]\s*\)\s)|$)/gi
  ]
  
  for (let i = 0; i < padroes.length; i++) {
    const padrao = padroes[i]
    const matches = [...conteudo.matchAll(padrao)]
    console.log(`📋 Padrão ${i + 1}: ${matches.length} matches`)
    
    if (matches.length >= 4) {
      console.log('✅ Padrão funcionou! Primeiros matches:', matches.slice(0, 2).map(m => m[0].substring(0, 50)))
      matches.forEach(m => {
        const letra = m[1].toLowerCase()
        const texto = m[2].replace(/\s+/g, ' ').trim()
        alternativas.push(`${letra}) ${texto}`)
      })
      break // Usou o primeiro padrão que funcionou
    }
  }
  
  // Fallback: procurar linha por linha - com espaço opcional
  if (alternativas.length < 4) {
    console.log('🔄 Usando fallback por linha...')
    const linhas = conteudo.split('\n')
    const padraoLinha = /^\s*([a-e])\s*[.\)]\s*(.+)/i
    let linhasVerificadas = 0
    
    for (const linha of linhas) {
      linhasVerificadas++
      const match = linha.match(padraoLinha)
      if (match) {
        const letra = match[1].toLowerCase()
        console.log(`✓ Linha ${linhasVerificadas}: "${linha.substring(0, 70)}"`)
        // Verificar se já não tem essa letra
        if (!alternativas.some(a => a.startsWith(`${letra})`))) {
          alternativas.push(`${letra}) ${match[2].trim()}`)
        }
      }
    }
    console.log(`📋 Verificadas ${linhasVerificadas} linhas, encontradas ${alternativas.length} alternativas`)
  }
  
  if (alternativas.length < 4) {
    console.log(`⚠️ Poucas alternativas (${alternativas.length}). Conteúdo problemático:`)
    console.log(conteudo.substring(0, 400))
  }
  
  console.log(`✅ Total alternativas: ${alternativas.length}`)
  if (alternativas.length > 0) {
    console.log('📝 Amostra:', alternativas[0].substring(0, 60))
  }
  return alternativas
}

// Separar enunciado do conteúdo
function separarEnunciado(conteudo, alternativas) {
  if (alternativas.length === 0) return conteudo
  
  // Encontrar posição da primeira alternativa
  const primeiraAlt = alternativas[0]
  const letra = primeiraAlt.charAt(0)
  
  // Procurar com espaço opcional entre letra e símbolo
  const padraoBusca = new RegExp(`\\b${letra}\\s*[.\\)]`, 'i')
  const match = conteudo.match(padraoBusca)
  
  if (match) {
    return conteudo.substring(0, match.index).trim()
  }
  
  return conteudo
}

// Extrair metadados do conteúdo (disciplina, tópico, fonte)
function extrairMetadados(conteudo, alternativas) {
  let enunciado = separarEnunciado(conteudo, alternativas)
  let disciplina = ''
  let topico = ''
  let fonte = ''
  
  // Padrão: "Disciplinas/Assuntos vinculados:"
  const padraoDisciplina = /Disciplinas\/Assuntos\s*vinculados:\s*([^\n]+)/i
  const matchDisciplina = conteudo.match(padraoDisciplina)
  
  if (matchDisciplina) {
    const linhaCompleta = matchDisciplina[1].trim()
    console.log('📚 Linha de disciplina encontrada:', linhaCompleta)
    
    // Tentar extrair hierarquia: Disciplina > Tópico > Subtópico
    const partes = linhaCompleta.split('>').map(p => p.trim())
    
    if (partes.length >= 2) {
      disciplina = partes[0]
      topico = partes[1]
      if (partes.length >= 3) {
        topico += ' > ' + partes[2]
      }
    } else {
      // Se não tem hierarquia, usa a linha toda como disciplina
      disciplina = linhaCompleta
    }
  }
  
  // Padrão: "Fonte:"
  const padraoFonte = /Fonte:\s*([^\n]+)/i
  const matchFonte = conteudo.match(padraoFonte)
  
  if (matchFonte) {
    fonte = matchFonte[1].trim()
    console.log('📰 Fonte encontrada:', fonte)
  }
  
  return { enunciado, disciplina, topico, fonte }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
  server: {
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const url = new URL(req.url, 'http://localhost')
            const key = url.searchParams.get('key')
            if (key) {
              const currentPath = proxyReq.path
              const separator = currentPath.includes('?') ? '&' : '?'
              proxyReq.path = `${currentPath}${separator}key=${key}`
            }
          })
        }
      }
    }
  }
})
