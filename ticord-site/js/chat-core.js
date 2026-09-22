/* =========================================================
   TICORD — chat de suporte: funções compartilhadas
   Usado por /chat (cliente) e /chatteam (equipe).
   O chat é ponto a ponto (WebRTC via PeerJS): as mensagens vão
   direto de um navegador ao outro e não passam por nenhum banco.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Identidade da equipe (aparece nas mensagens do staff) ---------- */
  var STAFF = {
    name: "Miguel Fracassi",
    role: "CEO",
    avatar: "assets/miguel-fracassi-chat.jpg"
  };

  var MAX = 2000; // tamanho máximo de uma mensagem

  /* ---------- PeerJS (com endereço reserva) ---------- */
  var SOURCES = [
    "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js",
    "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
  ];

  function getPeer() {
    return window.Peer || (window.peerjs && window.peerjs.Peer) || null;
  }

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = function () { s.remove(); fail(new Error("script")); };
      document.head.appendChild(s);
    });
  }

  function loadPeer() {
    var P = getPeer();
    if (P) return Promise.resolve(P);
    var chain = Promise.reject();
    SOURCES.forEach(function (src) {
      chain = chain.catch(function () { return loadScript(src); });
    });
    return chain.then(function () {
      var found = getPeer();
      if (!found) throw new Error("peer");
      return found;
    });
  }

  /* ---------- Utilidades ---------- */
  function api(path, body) {
    var opt = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body) { opt.method = "POST"; opt.body = JSON.stringify(body); }
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; return d; });
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function hhmm(ts) {
    return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function clean(v, max) {
    return typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
  }

  /* ---------- Mensagens ----------
     m = { mine: bool, staff: bool, name: string, text: string, ts: number }
     - mine:  mensagem de quem está usando esta tela (vai para a direita)
     - staff: mensagem da equipe (foto + nome brilhando + tag CEO)
     O nome só aparece quando muda quem está falando. */
  function nearBottom(log) {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 90;
  }

  function addMsg(log, m) {
    var stick = m.mine || nearBottom(log);
    var who = (m.staff ? "staff:" : "user:") + m.name;
    var cont = log.dataset.last === who;
    log.dataset.last = who;

    var row = el("div", "chat-msg " + (m.mine ? "is-mine" : "is-theirs") + (m.staff ? " is-staff" : "") + (cont ? " is-cont" : ""));

    var av;
    if (m.staff) {
      av = el("img", "chat-avatar");
      av.src = STAFF.avatar;
      av.alt = STAFF.name;
      av.width = 40; av.height = 40;
      av.decoding = "async";
    } else {
      av = el("span", "chat-avatar chat-avatar-txt", (m.name || "?").charAt(0).toUpperCase());
      av.setAttribute("aria-hidden", "true");
    }
    row.appendChild(av);

    var col = el("div", "chat-col");
    var meta = el("div", "chat-meta");
    meta.appendChild(el("span", "chat-name" + (m.staff ? " is-glow" : ""), m.name));
    if (m.staff) meta.appendChild(el("span", "chat-tag", STAFF.role));
    col.appendChild(meta);
    col.appendChild(el("div", "chat-bubble", m.text));
    col.appendChild(el("div", "chat-time", hhmm(m.ts)));
    row.appendChild(col);

    log.appendChild(row);
    if (stick) log.scrollTop = log.scrollHeight;
  }

  function addNote(log, text) {
    log.dataset.last = "";
    var stick = nearBottom(log);
    log.appendChild(el("div", "chat-note", text));
    if (stick) log.scrollTop = log.scrollHeight;
  }

  function clearLog(log) {
    log.textContent = "";
    log.dataset.last = "";
  }

  window.TicordChat = {
    STAFF: STAFF,
    MAX: MAX,
    api: api,
    loadPeer: loadPeer,
    el: el,
    hhmm: hhmm,
    clean: clean,
    addMsg: addMsg,
    addNote: addNote,
    clearLog: clearLog
  };
})();
