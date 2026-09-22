/* =========================================================
   TICORD — chat de suporte (lado do cliente)
   Nada é salvo: a conversa existe só nesta aba e na aba da equipe.
   ========================================================= */
(function () {
  "use strict";
  var C = window.TicordChat;
  var A = window.TicordAuth;
  if (!C || !A) return;

  function $(id) { return document.getElementById(id); }

  var VIEWS = ["c-load", "c-gate", "c-start", "c-chat"];
  var OFFLINE = "Nenhum atendente está online agora. Tente de novo em alguns minutos.";
  var NETFAIL = "Não foi possível conectar ao chat. Verifique sua internet e tente de novo.";

  var log = $("c-log");
  var input = $("c-input");
  var sendBtn = $("c-send");

  var peer = null, conn = null, timer = null;
  var inChat = false, finished = false, gotReply = false, closing = false;
  var myName = "";

  function show(id) { VIEWS.forEach(function (v) { $(v).hidden = v !== id; }); }

  function setStartMsg(text) { $("c-start-msg").textContent = text || ""; }

  function setStatus(kind, text) {
    $("c-dot").className = "chat-dot" + (kind === "on" ? " is-on" : kind === "wait" ? " is-wait" : "");
    $("c-status").textContent = text;
  }

  function lockInput(locked) {
    input.disabled = locked;
    sendBtn.disabled = locked;
  }

  function grow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  }

  /* ---------- Encerrar tudo e limpar ---------- */
  function teardown() {
    clearTimeout(timer);
    closing = true;
    try { if (conn) conn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    conn = null;
    peer = null;
    inChat = false;
  }

  function backToStart(msg) {
    teardown();
    C.clearLog(log);
    input.value = "";
    grow();
    $("c-form").hidden = false;
    $("c-over").hidden = true;
    $("c-leave").hidden = false;
    $("c-begin").disabled = false;
    setStartMsg(msg || "");
    show("c-start");
  }

  /* ---------- Tela inicial / login ---------- */
  function render() {
    var s = A.getState();
    if (!s.user) {
      if (inChat) teardown();
      return show("c-gate");
    }
    if (inChat) return;
    var p = s.profile || {};
    $("c-name").textContent = p.first_name || "";
    show("c-start");
  }

  $("c-login").addEventListener("click", A.openLogin);
  A.ready.then(render);
  window.addEventListener("ticord-auth", render);

  /* ---------- Iniciar pedido ---------- */
  $("c-begin").addEventListener("click", function () {
    var btn = $("c-begin");
    btn.disabled = true;
    setStartMsg("");
    C.api("/api/support-hub").then(function (d) {
      if (!d.ok || !d.hub) throw new Error(d.error || NETFAIL);
      return C.loadPeer().then(
        function (P) { connect(P, d.hub); },
        function () { throw new Error(NETFAIL); }
      );
    }).catch(function (e) {
      btn.disabled = false;
      setStartMsg(e && e.message ? e.message : NETFAIL);
    });
  });

  function connect(P, hub) {
    var p = (A.getState().profile) || {};
    myName = ((p.first_name || "") + " " + (p.last_name || "")).trim() || "Você";

    C.clearLog(log);
    finished = false;
    gotReply = false;
    closing = false;
    inChat = true;
    $("c-form").hidden = false;
    $("c-over").hidden = true;
    $("c-leave").hidden = false;
    lockInput(true);
    setStatus("wait", "Conectando…");
    show("c-chat");

    var opened = false;
    var thisPeer = new P();
    peer = thisPeer;

    timer = setTimeout(function () {
      if (!opened && peer === thisPeer) backToStart(NETFAIL);
    }, 20000);

    thisPeer.on("error", function (err) {
      if (opened || peer !== thisPeer) return;
      backToStart(err && err.type === "peer-unavailable" ? OFFLINE : NETFAIL);
    });

    thisPeer.on("open", function () {
      if (peer !== thisPeer) return;
      var c = thisPeer.connect(hub, { reliable: true, serialization: "json" });
      conn = c;

      c.on("open", function () {
        if (conn !== c) return;
        opened = true;
        clearTimeout(timer);
        c.send({ t: "hello", name: myName, email: p.email || "" });
        lockInput(false);
        setStatus("wait", "Aguardando resposta da equipe");
        C.addNote(log, "Você está conectado. Escreva sua mensagem e a equipe responde por aqui.");
        input.focus();
      });

      c.on("data", function (d) { if (conn === c) onData(d); });

      c.on("close", function () {
        if (conn !== c || closing) return;
        if (!opened) return backToStart(NETFAIL);
        if (!finished) finish("A conexão com a equipe foi perdida.");
      });

      c.on("error", function () {
        if (conn !== c || opened) return;
        backToStart(NETFAIL);
      });
    });
  }

  /* ---------- Receber ---------- */
  function onData(d) {
    if (!d || typeof d !== "object") return;
    if (d.t === "msg" && typeof d.text === "string") {
      var text = d.text.slice(0, C.MAX);
      if (!text.trim()) return;
      C.addMsg(log, { mine: false, staff: true, name: C.STAFF.name, text: text, ts: Date.now() });
      if (!gotReply) { gotReply = true; setStatus("on", "Em atendimento"); }
    } else if (d.t === "end") {
      finish("A equipe finalizou este atendimento.");
    }
  }

  function finish(text) {
    finished = true;
    lockInput(true);
    setStatus("off", "Atendimento finalizado");
    C.addNote(log, text);
    $("c-form").hidden = true;
    $("c-over").hidden = false;
    $("c-leave").hidden = true;
    closing = true;
    try { if (conn) conn.close(); } catch (e) {}
  }

  /* ---------- Enviar ---------- */
  function send() {
    var text = input.value.trim();
    if (!text || finished || !conn || !conn.open) return;
    text = text.slice(0, C.MAX);
    try {
      conn.send({ t: "msg", text: text });
    } catch (e) {
      return C.addNote(log, "Não foi possível enviar essa mensagem. Tente de novo.");
    }
    C.addMsg(log, { mine: true, staff: false, name: myName, text: text, ts: Date.now() });
    input.value = "";
    grow();
  }

  $("c-form").addEventListener("submit", function (e) { e.preventDefault(); send(); });
  input.addEventListener("input", grow);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });

  /* ---------- Encerrar ---------- */
  $("c-leave").addEventListener("click", function () {
    if (!window.confirm("Encerrar este chat? A conversa será apagada e não poderá ser recuperada.")) return;
    try { if (conn && conn.open) conn.send({ t: "leave" }); } catch (e) {}
    lockInput(true);
    setTimeout(function () { backToStart(""); }, 250);
  });

  $("c-new").addEventListener("click", function () { backToStart(""); });

  /* ---------- Avisa a equipe na hora se a aba for fechada ---------- */
  window.addEventListener("pagehide", function () {
    if (!inChat || finished) return;
    try { if (conn && conn.open) conn.send({ t: "leave", gone: true }); } catch (e) {}
  });

  /* ---------- Não sair da página durante o atendimento ---------- */
  window.addEventListener("beforeunload", function (e) {
    if (inChat && !finished) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
})();
