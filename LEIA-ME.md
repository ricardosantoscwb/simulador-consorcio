# Simulador de Consórcio

Entrevista → Laudo → Detalhe → Grupos. Acesso por código no e-mail (sem senha), portado da área do Estaleiro.

- `fontes/index.html` · o app (edite aqui). `node build.mjs` cola em `nucleo/app-html.mjs` (gerado, não versionado).
- `funcoes/` · Netlify Functions: `/` (app, só com sessão), `/entrar`, `/api/codigo`, `/api/entrar`, `/api/sair`, `/api/dados` (grupos compartilhados, Netlify Blobs).
- `nucleo/` · sessão, limites, e-mail, páginas. Nunca é publicado.
- Variáveis na Netlify: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (segredo), `ADMIN_EMAILS`, `USUARIOS` (quem pode entrar, separados por vírgula).
- Testes: `npm install && npm test` (store em memória, e-mail capturado).
- Cada push no `main` publica (gasta crédito da Netlify): agrupe mudanças.
