/* =========================================================
   TICORD — painel da equipe (/chatteam)
   Recebe os chats dos clientes em tempo real. Nada é salvo:
   ao recarregar ou sair, todas as conversas somem.
   ========================================================= */
(function () {
  "use strict";
  var C = window.TicordChat;
  if (!C) return;

  function $(id) { return document.getElementById(id); }

  var peer = null;
  var fatal = false;
  var leaving = false;
  var chats = {};      // id -> chat
  var order = [];      // ids, mais novos primeiro
  var sel = null;      // id do chat aberto
  var seq = 0;

  var list = $("t-list");
  var grid = $("t-grid");
  var log = $("t-log");
  var input = $("t-input");

  function desktop() { return window.matchMedia("(min-width: 761px)").matches; }

  /* ---------- Chave de acesso ---------- */
  function setKeyMsg(t) { $("t-keymsg").textContent = t || ""; }

  $("t-keyform").addEventListener("submit", function (e) {
    e.preventDefault();
    var key = $("t-key").value.trim();
    if (!key) return setKeyMsg("Digite a chave de acesso.");
    var go = $("t-go");
    go.disabled = true;
    setKeyMsg("");

    C.api("/api/team-access", { key: key }).then(function (d) {
      $("t-key").value = "";
      if (!d.ok || !d.hub) {
        go.disabled = false;
        return setKeyMsg(d.error || "Não foi possível entrar. Tente de novo.");
      }
      return C.loadPeer().then(
        function (P) { enterPanel(P, d.hub); },
        function () {
          go.disabled = false;
          setKeyMsg("Não foi possível carregar o chat. Verifique a conexão e tente de novo.");
        }
      );
    }).catch(function () {
      go.disabled = false;
      setKeyMsg("Erro de conexão. Tente de novo.");
    });
  });

  /* ---------- Painel ---------- */
  function setOnline(kind, text) {
    $("t-dot").className = "chat-dot" + (kind === "on" ? " is-on" : kind === "wait" ? " is-wait" : "");
    $("t-online").textContent = text;
  }

  function banner(text) {
    var b = $("t-banner");
    b.textContent = text || "";
    b.hidden = !text;
  }

  function enterPanel(P, hub) {
    $("t-lock").hidden = true;
    $("t-panel").hidden = false;
    $("t-exit").hidden = false;
    renderAll();
    setOnline("wait", "Conectando…");

    var p = new P(hub);
    peer = p;

    p.on("open", function () {
      if (fatal) return;
      setOnline("on", "Online. Clientes já podem iniciar chats.");
      banner("");
    });

    p.on("connection", onConnection);

    p.on("disconnected", function () {
      if (fatal || p.destroyed) return;
      setOnline("off", "Sem conexão com o servidor. Reconectando…");
      setTimeout(function () {
        if (!fatal && !p.destroyed) { try { p.reconnect(); } catch (e) {} }
      }, 3000);
    });

    p.on("error", function (err) {
      var type = err && err.type;
      if (type === "unavailable-id") {
        fatal = true;
        setOnline("off", "Offline");
        banner("Este painel já está aberto em outra aba ou aparelho. Feche o outro e recarregue esta página.");
      } else if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
        setOnline("off", "Sem conexão com o servidor. Tentando de novo…");
      }
    });
  }

  /* ---------- Novo cliente conectando ---------- */
  function onConnection(conn) {
    var chat = null;
    var wait = setTimeout(function () {
      if (!chat) { try { conn.close(); } catch (e) {} }
    }, 10000);

    function gone() {
      clearTimeout(wait);
      if (chat && chat.state === "active") endChat(chat, "O cliente saiu da página.");
    }

    conn.on("data", function (d) {
      if (!d || typeof d !== "object") return;

      if (!chat) {
        if (d.t !== "hello") return;
        clearTimeout(wait);
        chat = createChat(conn, d);
        return;
      }
      if (chat.state !== "active") return;

      if (d.t === "msg" && typeof d.text === "string") {
        var text = d.text.slice(0, C.MAX);
        if (text.trim()) pushMsg(chat, "them", text);
      } else if (d.t === "leave") {
        endChat(chat, d.gone ? "O cliente saiu da página." : "O cliente encerrou o chat.");
      }
    });

    conn.on("close", gone);
    conn.on("error", gone);
  }

  function createChat(conn, hello) {
    var id = "c" + (++seq);
    var chat = {
      id: id,
      conn: conn,
      name: C.clean(hello.name, 60) || "Cliente",
      email: C.clean(hello.email, 120),
      msgs: [],
      state: "active",
      startedAt: Date.now(),
      last: Date.now(),
      unread: 0,
      fresh: false
    };
    chats[id] = chat;
    order.unshift(id);
    chat.msgs.push({ kind: "sys", text: "Chat iniciado.", ts: Date.now() });
    // No desktop abre o primeiro chat sozinho; no celular só sinaliza na lista
    if (!sel && desktop()) select(id); else renderAll();
    if (!seen(chat)) chat.fresh = true;
    renderList();
    updateTitle();
    return chat;
  }

  /* ---------- Mensagens ---------- */
  function seen(chat) {
    return sel === chat.id && !document.hidden;
  }

  function pushMsg(chat, kind, text) {
    var m = { kind: kind, text: text, ts: Date.now() };
    chat.msgs.push(m);
    chat.last = m.ts;
    if (sel === chat.id) appendToLog(chat, m);
    if (kind === "them" && !seen(chat)) chat.unread += 1;
    renderList();
    updateTitle();
  }

  function appendToLog(chat, m) {
    if (m.kind === "sys") return C.addNote(log, m.text);
    var mine = m.kind === "mine";
    C.addMsg(log, {
      mine: mine,
      staff: mine,
      name: mine ? C.STAFF.name : chat.name,
      text: m.text,
      ts: m.ts
    });
  }

  function endChat(chat, text) {
    if (chat.state !== "active") return;
    chat.state = "ended";
    chat.last = Date.now();
    var m = { kind: "sys", text: text, ts: Date.now() };
    chat.msgs.push(m);
    if (sel === chat.id) appendToLog(chat, m);
    renderAll();
    updateTitle();
  }

  /* ---------- Lista de chats ---------- */
  function preview(chat) {
    for (var i = chat.msgs.length - 1; i >= 0; i--) {
      if (chat.msgs[i].kind !== "sys") return (chat.msgs[i].kind === "mine" ? "Você: " : "") + chat.msgs[i].text;
    }
    return "Sem mensagens ainda";
  }

  function group(title, ids) {
    if (!ids.length) return;
    list.appendChild(C.el("p", "tm-group", title + " (" + ids.length + ")"));
    ids.forEach(function (id) {
      var chat = chats[id];
      var b = C.el("button", "tm-item" + (id === sel ? " is-sel" : "") + (chat.state === "ended" ? " is-ended" : ""));
      b.type = "button";

      var top = C.el("div", "tm-item-top");
      top.appendChild(C.el("span", "tm-item-name", chat.name));
      top.appendChild(C.el("span", "tm-item-time", C.hhmm(chat.last)));
      b.appendChild(top);

      var bottom = C.el("div", "tm-item-top");
      bottom.appendChild(C.el("span", "tm-item-prev", preview(chat)));
      var badge = chat.unread ? String(chat.unread) : (chat.fresh ? "Novo" : "");
      if (badge) bottom.appendChild(C.el("span", "tm-badge", badge));
      b.appendChild(bottom);

      b.addEventListener("click", function () { select(id); });
      list.appendChild(b);
    });
  }

  function renderList() {
    var keep = list.scrollTop;
    list.textContent = "";
    var active = order.filter(function (id) { return chats[id].state === "active"; });
    var ended = order.filter(function (id) { return chats[id].state === "ended"; })
      .sort(function (a, b) { return chats[b].last - chats[a].last; });
    group("Em andamento", active);
    group("Finalizados", ended);
    list.scrollTop = keep;

    var n = active.length;
    $("t-count").textContent = n === 1 ? "1 chat em andamento" : n + " chats em andamento";
  }

  /* ---------- Conversa aberta ---------- */
  function select(id) {
    sel = id;
    chats[id].unread = 0;
    chats[id].fresh = false;
    renderAll();
    updateTitle();
    if (chats[id].state === "active" && desktop()) input.focus();
  }

  function renderThread() {
    var chat = sel && chats[sel];
    grid.classList.toggle("has-sel", !!chat);
    $("t-empty").hidden = !!chat;
    $("t-body").hidden = !chat;
    if (!chat) return;

    $("t-hname").textContent = chat.name;
    $("t-hmeta").textContent = (chat.email ? chat.email + " · " : "") + "iniciado às " + C.hhmm(chat.startedAt);

    var active = chat.state === "active";
    $("t-end").hidden = !active;
    $("t-remove").hidden = active;
    $("t-form").hidden = !active;
    $("t-over").hidden = active;

    C.clearLog(log);
    chat.msgs.forEach(function (m) { appendToLog(chat, m); });
    log.scrollTop = log.scrollHeight;
  }

  function renderAll() {
    renderList();
    renderThread();
  }

  /* ---------- Responder ---------- */
  function send() {
    var chat = sel && chats[sel];
    var text = input.value.trim();
    if (!chat || chat.state !== "active" || !text) return;
    text = text.slice(0, C.MAX);
    try {
      chat.conn.send({ t: "msg", text: text });
    } catch (e) {
      return C.addNote(log, "Não foi possível enviar. O cliente pode ter saído.");
    }
    pushMsg(chat, "mine", text);
    input.value = "";
    input.style.height = "auto";
  }

  $("t-form").addEventListener("submit", function (e) { e.preventDefault(); send(); });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });

  /* ---------- Finalizar / remover ---------- */
  $("t-end").addEventListener("click", function () {
    var chat = sel && chats[sel];
    if (!chat || chat.state !== "active") return;
    if (!window.confirm("Finalizar o chat com " + chat.name + "? O cliente será avisado e a conversa será encerrada.")) return;
    try { chat.conn.send({ t: "end" }); } catch (e) {}
    endChat(chat, "Chat finalizado pela equipe.");
    setTimeout(function () { try { chat.conn.close(); } catch (e) {} }, 400);
  });

  $("t-remove").addEventListener("click", function () {
    var chat = sel && chats[sel];
    if (!chat || chat.state === "active") return;
    delete chats[chat.id];
    order = order.filter(function (id) { return id !== chat.id; });
    sel = null;
    renderAll();
  });

  $("t-back").addEventListener("click", function () {
    sel = null;
    renderAll();
  });

  /* ---------- Aviso na aba ---------- */
  function updateTitle() {
    var n = 0;
    order.forEach(function (id) { n += chats[id].unread || (chats[id].fresh ? 1 : 0); });
    document.title = (n ? "(" + n + ") " : "") + "Painel de chats";
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && sel && chats[sel] && (chats[sel].unread || chats[sel].fresh)) {
      chats[sel].unread = 0;
      chats[sel].fresh = false;
      renderList();
      updateTitle();
    }
  });

  /* ---------- Sair ---------- */
  function activeCount() {
    return order.filter(function (id) { return chats[id].state === "active"; }).length;
  }

  $("t-exit").addEventListener("click", function () {
    var n = activeCount();
    if (n && !window.confirm("Ainda há " + n + " chat(s) em andamento. Sair fecha todos e apaga as conversas. Sair mesmo assim?")) return;
    fatal = true;
    leaving = true;
    try { if (peer) peer.destroy(); } catch (e) {}
    location.reload();
  });

  window.addEventListener("beforeunload", function (e) {
    if (!leaving && peer && order.length) { e.preventDefault(); e.returnValue = ""; }
  });
})();
