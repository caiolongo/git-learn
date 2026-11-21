// Progresso salvo no localStorage do navegador. Um banco SQLite não é necessário
// para este volume (9 abas e 84 respostas) e exigiria um servidor ou WebAssembly.
const KEY = 'gh900-progress-v1';
const empty = () => ({ studied: {}, answers: {}, tab: null });
export function loadProgress() {
    try {
        return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    }
    catch {
        return empty();
    }
}
export function saveProgress(p) {
    localStorage.setItem(KEY, JSON.stringify(p));
}
export function exportProgress(p) {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gh900-progresso.json';
    a.click();
    URL.revokeObjectURL(a.href);
}
export async function importProgress(file) {
    const data = JSON.parse(await file.text());
    if (typeof data !== 'object' || data === null || !('studied' in data) || !('answers' in data)) {
        throw new Error('Arquivo de progresso inválido');
    }
    return { ...empty(), ...data };
}
