# Simulador de Consórcio

Entrevista → Laudo → Detalhe → Grupos. Acesso por código no e-mail (sem senha), portado da área do Estaleiro.

- `fontes/index.html` · o app (edite aqui). `node build.mjs` cola em `nucleo/app-html.mjs` (gerado, não versionado).
- `funcoes/` · Netlify Functions: `/` (app, só com sessão), `/entrar`, `/api/codigo`, `/api/entrar`, `/api/sair`, `/api/dados` (grupos compartilhados, Netlify Blobs), `/admin` + `/api/usuarios` (painel: incluir, pausar, reativar, excluir; só admin).
- Usuários: ADMIN_EMAILS e USUARIOS (Netlify) entram sempre; os demais vêm do painel (`nucleo/usuarios.mjs`, Blobs). Pausado perde a sessão na hora. O módulo é portável pra outros apps (holerite).
- `nucleo/` · sessão, limites, e-mail, páginas. Nunca é publicado.
- Variáveis na Netlify: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (segredo), `ADMIN_EMAILS`, `USUARIOS` (opcional: e-mails fixos, separados por vírgula; o normal é cadastrar pelo painel).
- Testes: `npm install && npm test` (store em memória, e-mail capturado).
- Cada push no `main` publica (gasta crédito da Netlify): agrupe mudanças.
