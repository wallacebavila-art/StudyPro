import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { firebaseService } from '../services/firebase';

const StudyContext = createContext();

// Estado inicial
const initialState = {
  questions: {},
  simulados: {},
  config: { geminiKey: '' },
  flashcards_custom: {},
  fc_progress: {},
  isOnline: navigator.onLine,
  isLoading: true,
  currentView: 'dashboard'
};

// Reducer
function studyReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'UPDATE_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export const StudyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(studyReducer, initialState);
  const [listeners, setListeners] = useState([]);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Carregar dados iniciais
        const [questions, simulados, config, flashcards, progress] = await Promise.all([
          firebaseService.get('questions').catch(() => ({})),
          firebaseService.get('simulados').catch(() => ({})),
          firebaseService.get('config').catch(() => ({ geminiKey: '' })),
          firebaseService.get('flashcards_custom').catch(() => ({})),
          firebaseService.get('fc_progress').catch(() => ({}))
        ]);

        dispatch({
          type: 'UPDATE_DATA',
          payload: {
            questions,
            simulados,
            config,
            flashcards_custom: flashcards,
            fc_progress: progress
          }
        });

        // Configurar listeners
        const newListeners = [
          firebaseService.onValue('questions', (val) => {
            dispatch({ type: 'UPDATE_DATA', payload: { questions: val || {} } });
          }),
          firebaseService.onValue('simulados', (val) => {
            dispatch({ type: 'UPDATE_DATA', payload: { simulados: val || {} } });
          }),
          firebaseService.onValue('config', (val) => {
            dispatch({ type: 'UPDATE_DATA', payload: { config: val || { geminiKey: '' } } });
          }),
          firebaseService.onValue('flashcards_custom', (val) => {
            dispatch({ type: 'UPDATE_DATA', payload: { flashcards_custom: val || {} } });
          }),
          firebaseService.onValue('fc_progress', (val) => {
            dispatch({ type: 'UPDATE_DATA', payload: { fc_progress: val || {} } });
          }),
          firebaseService.onConnection((connected) => {
            dispatch({ type: 'SET_ONLINE', payload: connected });
          })
        ];

        setListeners(newListeners);
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Erro ao inicializar:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initApp();

    // Cleanup listeners
    return () => {
      listeners.forEach(unsub => unsub && unsub());
    };
  }, []);

  // Funções de ação
  const setView = (view) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const updateConfig = async (newConfig) => {
    await firebaseService.set('config', newConfig);
  };

  const addQuestion = async (question) => {
    await firebaseService.set(`questions/${question.id}`, question);
  };

  const updateQuestion = async (id, updates) => {
    const current = state.questions[id];
    if (current) {
      await firebaseService.set(`questions/${id}`, { ...current, ...updates });
    }
  };

  const deleteQuestion = async (id) => {
    await firebaseService.remove(`questions/${id}`);
  };

  const addSimulado = async (simulado) => {
    await firebaseService.set(`simulados/${simulado.id}`, simulado);
  };

  const deleteSimulado = async (id) => {
    await firebaseService.remove(`simulados/${id}`);
  };

  const clearAllSimulados = async () => {
    await firebaseService.remove('simulados');
  };

  const addFlashcard = async (flashcard) => {
    await firebaseService.set(`flashcards_custom/${flashcard.id}`, flashcard);
  };

  const updateFCProgress = async (id, progress) => {
    await firebaseService.set(`fc_progress/${id}`, progress);
  };

  const value = {
    ...state,
    setView,
    updateConfig,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addSimulado,
    deleteSimulado,
    clearAllSimulados,
    addFlashcard,
    updateFCProgress
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};