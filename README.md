# StudyPRO

Aplicação de estudos para concursos públicos.

## Tecnologias

- React 18+
- Vite
- Firebase (Realtime Database)
- CSS Modules / Utility Classes

## Como executar

```bash
npm install
npm run dev
```

## Funcionalidades

- Banco de questões
- Simulados
- Flashcards
- Análise de desempenho
- Geração de questões com IA (Gemini)
- Upload de PDFs para extração automática

## Estrutura do Projeto

```
src/
├── components/
│   ├── Layout/
│   ├── Dashboard/
│   ├── Banco/
│   └── ...
├── services/
│   ├── firebase.js
│   └── gemini.js
├── context/
│   └── StudyContext.jsx
├── hooks/
│   └── useKeyboardShortcuts.js
└── styles/
    ├── global.css
    └── utils.css
```
