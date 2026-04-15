import { useEffect } from 'react';

export const useKeyboardShortcuts = (callbacks) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Não interceptar se estiver em input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      const { key } = e;

      // Atalhos específicos
      if (callbacks.onArrowRight && key === 'ArrowRight') {
        e.preventDefault();
        callbacks.onArrowRight();
      }
      if (callbacks.onArrowLeft && key === 'ArrowLeft') {
        e.preventDefault();
        callbacks.onArrowLeft();
      }
      if (callbacks.onEscape && key === 'Escape') {
        e.preventDefault();
        callbacks.onEscape();
      }
      if (callbacks.onKey && ['a', 'b', 'c', 'd', 'e'].includes(key.toLowerCase())) {
        e.preventDefault();
        callbacks.onKey(key.toUpperCase());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};