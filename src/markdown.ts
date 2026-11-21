// Renderizador mínimo para o subconjunto de Markdown usado no material:
// títulos, parágrafos, listas, tabelas, blocos de código, negrito, itálico, código e links.

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(text: string): string {
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s).replace(/\\([\\`*_[\]()#|>-])/g, '$1');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)!?]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
}

const LIST = /^\s*([-*]|\d+\.) /;
const BLOCK_START = /^(#{1,6} |\||```)/;

function splitRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => inline(c.trim()));
}

export function render(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      html += `<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`;
      continue;
    }

    const heading = line.match(/^(#{1,6}) (.*)/);
    if (heading) {
      const level = Math.max(heading[1].length, 2); // h1 fica reservado ao cabeçalho da página
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const head = splitRow(rows[0]);
      const body = rows.slice(2).map(splitRow);
      html += '<table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('')
        + '</tbody></table>';
      continue;
    }

    if (LIST.test(line)) {
      const tag = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
      const items: string[] = [];
      while (i < lines.length && LIST.test(lines[i])) items.push(lines[i++].replace(LIST, ''));
      html += `<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${tag}>`;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // Parágrafo: sempre consome ao menos a linha atual, para nunca travar o laço.
    const buf = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]) && !LIST.test(lines[i])) {
      buf.push(lines[i++]);
    }
    html += `<p>${inline(buf.join(' '))}</p>`;
  }
  return html;
}
