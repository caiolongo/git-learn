# GH-900 · Estudo interativo

Material do GitHub Foundations em abas (Início, Capítulos 1–7, Simulado), com marcação de "estudado" e testes interativos.

## Rodar

### Com dois cliques (Windows)

Dê dois cliques em **`Iniciar GH-900.bat`**. Ele:

1. Confere se o Node.js e o npm estão instalados. Se não estiverem, mostra o link para nodejs.org e para.
2. Se não existir a pasta `node_modules`, roda `npm install` no console, para você acompanhar a instalação. Se falhar, o console fica aberto com o erro.
3. Abre a janela de controle por meio do `servidor.vbs`, sem console visível, e fecha o próprio console.

A janela de controle (`servidor.ps1`):

- Escolhe a primeira porta livre a partir de 8000 e roda `npm start` em segundo plano, sem janela.
- Mostra o status em cores: laranja "Iniciando…", verde "Servidor ativo" (com porta e link) e vermelho "Servidor parado" (com o fim do log).
- Abre o navegador automaticamente quando o servidor responde. O botão **Abrir no navegador** reabre a página.
- **Desligar e fechar** (ou o X da janela) encerra o servidor inteiro (cmd, npm e node) e tudo o que estiver escutando na porta.
- Grava a saída do servidor em `%TEMP%\gh900-servidor.log`.

### Pelo terminal

```bash
npm install   # só na primeira vez (instala o TypeScript)
npm start     # compila e abre em http://localhost:8000
```

Nos dois casos é preciso servidor local: o navegador bloqueia `fetch()` de JSON em páginas abertas via `file://`.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `data/manifest.json` | Lista das abas e arquivo de cada uma |
| `data/<id>.json` | Conteúdo em Markdown (`contentMd`) e questões (`quiz.questions`) |
| `src/*.ts` | Código TypeScript (carregamento, Markdown, progresso) |
| `dist/` | JavaScript gerado por `npm run build` — não edite |
| `styles.css` | Estilos (tema claro/escuro automático) |
| `server.mjs` | Servidor estático sem dependências |
| `Iniciar GH-900.bat` | Atalho de dois cliques: instala dependências e abre a janela de controle |
| `servidor.vbs` | Abre o `servidor.ps1` sem console visível (usado pelo `.bat`) |
| `servidor.ps1` | Janela de controle do servidor (status, porta, navegador, desligar) |

Para editar o conteúdo, altere os JSONs em `data/`. Para adicionar uma aba, crie o JSON e inclua-o no `manifest.json`.

O progresso fica no `localStorage` do navegador. Use **Exportar** e **Importar** para levá-lo a outro navegador ou máquina.
