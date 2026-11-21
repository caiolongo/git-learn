import type { Chapter, ChapterRef, Letter, Manifest, Question } from './types.js';
import { inline, render } from './markdown.js';
import { exportProgress, importProgress, loadProgress, saveProgress, type Progress } from './progress.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

let manifest: Manifest;
let progress: Progress = loadProgress();
const cache = new Map<string, Chapter>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

async function getChapter(ref: ChapterRef): Promise<Chapter> {
  let ch = cache.get(ref.id);
  if (!ch) {
    ch = await fetchJson<Chapter>(`data/${ref.file}`);
    cache.set(ref.id, ch);
  }
  return ch;
}

function score(ref: ChapterRef) {
  const answers = progress.answers[ref.id] ?? {};
  const answered = Object.keys(answers).length;
  const right = cache.get(ref.id)?.quiz?.questions.filter((q) => answers[q.n] === q.answer).length ?? 0;
  return { answered, right, total: ref.questions };
}

function renderTabs(): void {
  const nav = $('tabs');
  nav.innerHTML = '';
  for (const ref of manifest.chapters) {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(ref.id === progress.tab));
    b.className = progress.studied[ref.id] ? 'done' : '';
    b.title = ref.title;
    b.innerHTML = `<span class="dot"></span>${ref.short}`;
    b.onclick = () => void show(ref.id);
    nav.appendChild(b);
  }
  const done = manifest.chapters.filter((c) => progress.studied[c.id]).length;
  $('prog-text').textContent = `${done}/${manifest.chapters.length} estudados`;
  $('prog-bar').style.width = `${(100 * done) / manifest.chapters.length}%`;
}

async function show(id: string): Promise<void> {
  const ref = manifest.chapters.find((c) => c.id === id) ?? manifest.chapters[0];
  progress.tab = ref.id;
  saveProgress(progress);
  renderTabs();

  const main = $('content');
  main.innerHTML = '<p class="muted">Carregando…</p>';
  const ch = await getChapter(ref);

  main.innerHTML = `
    <div class="studied ${progress.studied[ch.id] ? 'done' : ''}" id="studied-box">
      <label><input type="checkbox" id="chk" ${progress.studied[ch.id] ? 'checked' : ''}> Marcar como estudado</label>
      ${ch.quiz ? '<span class="score" id="score"></span>' : ''}
    </div>
    <h2>${inline(ch.title)}</h2>
    ${render(ch.contentMd)}
    ${ch.quiz ? `
      <h3>${inline(ch.quiz.title)}</h3>
      <div class="quiz-tools"><button class="btn" id="redo">Refazer teste</button></div>
      <div id="quiz"></div>
      <p class="result" id="result"></p>
      <details class="gabarito"><summary>Ver gabarito completo</summary>
        ${ch.quiz.questions.map((q) => `<p><strong>${q.n} — ${q.answer}.</strong> ${inline(q.explanation)}</p>`).join('')}
      </details>` : ''}`;

  $<HTMLInputElement>('chk').onchange = (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    progress.studied[ch.id] = checked;
    saveProgress(progress);
    $('studied-box').classList.toggle('done', checked);
    renderTabs();
  };

  if (ch.quiz) {
    renderQuiz(ref, ch.quiz.questions);
    $('redo').onclick = () => {
      delete progress.answers[ref.id];
      saveProgress(progress);
      renderQuiz(ref, ch.quiz!.questions);
    };
  }
  window.scrollTo(0, 0);
}

function renderQuiz(ref: ChapterRef, questions: Question[]): void {
  const box = $('quiz');
  box.innerHTML = '';
  for (const q of questions) {
    const card = document.createElement('div');
    card.className = 'q';
    card.innerHTML = `<p><strong>${q.n}.</strong> ${inline(q.text)}</p><div class="opts"></div><div class="expl hidden"></div>`;
    const opts = card.querySelector<HTMLDivElement>('.opts')!;
    const expl = card.querySelector<HTMLDivElement>('.expl')!;

    const reveal = (chosen: Letter) => {
      opts.querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => {
        b.disabled = true;
        if (b.dataset.letter === q.answer) b.classList.add('right');
        else if (b.dataset.letter === chosen) b.classList.add('wrong');
      });
      expl.innerHTML = (chosen === q.answer ? '✔ Correta. ' : `✘ Resposta certa: <strong>${q.answer}</strong>. `)
        + inline(q.explanation);
      expl.classList.remove('hidden');
    };

    for (const o of q.options) {
      const b = document.createElement('button');
      b.className = 'opt';
      b.dataset.letter = o.letter;
      b.innerHTML = `<strong>${o.letter})</strong> ${inline(o.text)}`;
      b.onclick = () => {
        (progress.answers[ref.id] ??= {})[q.n] = o.letter;
        saveProgress(progress);
        reveal(o.letter);
        updateScore(ref);
      };
      opts.appendChild(b);
    }

    const previous = progress.answers[ref.id]?.[q.n];
    if (previous) reveal(previous);
    box.appendChild(card);
  }
  updateScore(ref);
}

function updateScore(ref: ChapterRef): void {
  const s = score(ref);
  $('score').textContent = s.answered
    ? `Teste: ${s.right}/${s.answered} acertos (${s.total} questões)`
    : `Teste: ${s.total} questões, nenhuma respondida`;
  const pct = Math.round((100 * s.right) / s.total);
  $('result').textContent = s.answered === s.total
    ? `Resultado: ${s.right}/${s.total} (${pct}%), ${pct >= 70 ? 'acima' : 'abaixo'} da meta de 70%.`
    : '';
}

function wireToolbar(): void {
  $('export').onclick = () => exportProgress(progress);
  const input = $<HTMLInputElement>('import-file');
  $('import').onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      progress = await importProgress(file);
      saveProgress(progress);
      await show(progress.tab ?? manifest.chapters[0].id);
    } catch (err) {
      alert((err as Error).message);
    }
    input.value = '';
  };
  $('reset-all').onclick = () => {
    if (!confirm('Apagar todas as marcações de estudado e respostas dos testes?')) return;
    progress = { studied: {}, answers: {}, tab: progress.tab };
    saveProgress(progress);
    void show(progress.tab ?? manifest.chapters[0].id);
  };
}

async function start(): Promise<void> {
  try {
    manifest = await fetchJson<Manifest>('data/manifest.json');
  } catch {
    $('content').innerHTML = `<p class="error">Não foi possível carregar os dados. Abra a página por um servidor local
      (<code>npm start</code>), não direto pelo arquivo: o navegador bloqueia <code>fetch</code> em <code>file://</code>.</p>`;
    return;
  }
  document.title = manifest.title;
  // Carrega os capítulos já respondidos para que a pontuação apareça certa desde o início.
  await Promise.all(manifest.chapters.filter((c) => progress.answers[c.id]).map(getChapter));
  wireToolbar();
  await show(progress.tab ?? manifest.chapters[0].id);
}

void start();
