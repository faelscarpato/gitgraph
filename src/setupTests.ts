import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpa a árvore do DOM simulada (JSDOM) após cada teste 
// para evitar vazamento de memória e garantir que um teste não interfira no outro.
afterEach(() => {
  cleanup();
});

// Mock Global para o ResizeObserver.
// Como o Gitgraph utiliza o Radix UI e painéis redimensionáveis (react-resizable-panels),
// o JSDOM não possui o ResizeObserver nativo, o que causaria erros ao testar componentes visuais.
// Este mock previne que os testes quebrem ao renderizar a interface.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Global para o IndexedDB.
// Prepara o terreno para quando formos testar a persistência local (src/lib/persistence/idb.ts).
const indexedDBMock = {
  open: () => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: () => ({
        createIndex: () => {},
      }),
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ onsuccess: null, onerror: null }),
          put: () => ({ onsuccess: null, onerror: null }),
          add: () => ({ onsuccess: null, onerror: null }),
          delete: () => ({ onsuccess: null, onerror: null }),
          clear: () => ({ onsuccess: null, onerror: null }),
        }),
      }),
    },
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
});