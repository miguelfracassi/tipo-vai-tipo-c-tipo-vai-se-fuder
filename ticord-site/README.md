# Site institucional da Ticord

Site estático em HTML, CSS e JavaScript puro. Não precisa de build.

## Estrutura

```
/index.html      → página inicial
/sobre.html      → sobre o grupo
/projetos.html   → projetos administrados
/apoio.html      → central de apoio (com redirecionamento)
/css/style.css   → todo o estilo (cores no topo do arquivo, bloco :root)
/js/script.js    → header fixo, menu mobile e redirecionamento do apoio
/js/auth.js      → login, cadastro, menu da conta e sair 
/js/dashboard.js → libera o dashboard só para clientes
/dashboard.html  → área do cliente
/chat.html       → chat de suporte do cliente (/chat)
/chatteam.html   → painel escondido da equipe (/chatteam)
/js/chat-core.js, chat.js, chatteam.js → lógica do chat
/api/            → cadastro, login, sair e sessão (funções da Vercel)
/lib/            → banco Neon e senhas
/package.json    → dependência do Neon
/assets/         → logos (ticord, fun, cord, wow, shopping-mall)
/vercel.json     → configuração de hospedagem na Vercel
```

## Como editar

- **Cores:** bloco `:root` no início de `css/style.css`.
- **Adicionar um projeto:** em `projetos.html`, copie o bloco `<article class="project">` marcado como modelo. Depois inclua a marca também em `index.html` (blocos `.brand-cell` e `.structure-item`) e o link no rodapé.
- **Trocar uma logo:** substitua o arquivo dentro de `/assets` mantendo o mesmo nome.
- **Mudar o destino do apoio:** `apoio.html`, no `href` do botão e no `data-redirect` da div `#auto-redirect`. O tempo do redirecionamento fica em `data-seconds`.
- **Textos:** todos estão direto no HTML, com comentários indicando cada bloco.

## Publicar

Vercel: importe a pasta ou rode `vercel` na raiz. Também funciona em Netlify, GitHub Pages ou qualquer hospedagem estática — basta enviar os arquivos.

## Login (Neon + Vercel)

1. Vercel → Storage → Neon → conecte o banco ao projeto (cria a variável `DATABASE_URL`).
2. Publique. As tabelas `users` e `sessions` são criadas sozinhas no primeiro acesso.
3. Para tornar alguém cliente, no Neon (SQL Editor): `update users set is_client = true where email = 'email@da.pessoa';`

## Página escondida de planos (Pix)

- `andfopportunity.html` (`/andfopportunity`, plano Anual R$60) e `andfopportunity-diario.html` (`/andfopportunity-diario`, plano Diário R$1), ambas com o script `js/plano.js`; nenhuma: não está em nenhum menu ou rodapé e tem `noindex`.
- Precisa da variável de ambiente `MP_ACCESS_TOKEN` (Access Token de produção do Mercado Pago) na Vercel.
- Preço e nome do plano ficam em `lib/mp.js` (`PLANS`).
- O Pix é confirmado por `/api/mp-webhook` e pela conferência da página (`/api/plan-status`), sempre consultando o Mercado Pago.

## Chat de suporte (sem banco de dados)

- **Cliente:** `/chat`. Exige login; em seguida "Inicie um Pedido de Suporte" e o botão Iniciar.
- **Equipe:** `/chatteam` (escondida: sem link em menu/rodapé, com `noindex`). Pede a chave de acesso, **9999** por padrão. Para trocar, crie a variável `TEAM_KEY` na Vercel.
- O chat é ponto a ponto (WebRTC, via PeerJS): as mensagens vão direto de um navegador ao outro e **não são salvas em lugar nenhum**. Recarregar ou fechar a aba apaga a conversa.
- Só um painel `/chatteam` pode ficar aberto por vez. Se ninguém estiver com o painel aberto, o cliente vê "Nenhum atendente está online".
- A chave é conferida no servidor (`/api/team-access`). O endereço interno do chat é gerado em `lib/hub.js` e só é entregue a cliente logado (`/api/support-hub`) ou a quem souber a chave.
- **Staff no chat:** nome, cargo e foto ficam em `STAFF`, no topo de `js/chat-core.js` (foto em `assets/miguel-fracassi-chat.jpg`).
- O PeerJS é carregado por CDN (jsDelivr, com unpkg de reserva) e usa o servidor público do PeerJS só para o "aperto de mão" inicial.
