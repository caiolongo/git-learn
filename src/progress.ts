import type { Letter } from './types.js';

// Progresso salvo no localStorage do navegador. Um banco SQLite não é necessário
// para este volume (9 abas e 84 respostas) e exigiria um servidor ou WebAssembly.

const KEY = 'gh900-progress-v1';

export interface Progress {
  studied: Record<string, boolean>;
  answers: Record<string, Record<number, Letter>>;
  tab: string | null;
}

const empty = (): Progress => ({ studied: {}, answers: {}, tab: null });

export function loadProgress(): Progress {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function exportProgress(p: Progress): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gh900-progresso.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importProgress(file: File): Promise<Progress> {
  const data = JSON.parse(await file.text());
  if (typeof data !== 'object' || data === null || !('studied' in data) || !('answers' in data)) {
    throw new Error('Arquivo de progresso inválido');
  }
  return { ...empty(), ...data };
}
