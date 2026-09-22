/* =========================================================
   TICORD — painel escondido de inscrições (/formsadm)
   A chave é guardada só em memória (nesta variável), nunca em
   localStorage/cookie — cada "Atualizar lista" reenvia a
   chave para o servidor validar de novo. Mesmo padrão de
   confiança usado no /chatteam.
   ========================================================= */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function api(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; return d; });
    });
  }

  var savedKey = null;

  function setKeyMsg(t) { $("fa-keymsg").textContent = t || ""; }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch (e) { return iso; }
  }

  function whatsappLink(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
    return "https://wa.me/" + digits;
  }

  function renderEntries(entries) {
    var list = $("fa-list");
    var empty = $("fa-empty");
    list.textContent = "";

    $("fa-count").textContent = entries.length === 1
      ? "1 inscrição enviada"
      : entries.length + " inscrições enviadas";

    if (!entries.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    entries.forEach(function (e) {
      var card = document.createElement("article");
      card.className = "fa-card";

      var top = document.createElement("div");
      top.className = "fa-card-top";
      var name = document.createElement("span");
      name.className = "fa-name";
      name.textContent = e.full_name;
      var badge = document.createElement("span");
      badge.className = "fa-badge";
      badge.textContent = e.role_label;
      top.appendChild(name);
      top.appendChild(badge);

      var meta = document.createElement("div");
      meta.className = "fa-meta";
      var email = document.createElement("span");
      email.textContent = e.email;
      var phoneLink = document.createElement("a");
      phoneLink.href = whatsappLink(e.phone);
      phoneLink.target = "_blank";
      phoneLink.rel = "noopener";
      phoneLink.textContent = "WhatsApp: " + e.phone;
      meta.appendChild(email);
      meta.appendChild(phoneLink);

      var exp = document.createElement("p");
      exp.className = "fa-exp";
      exp.textContent = e.experience;

      var date = document.createElement("p");
      date.className = "fa-date";
      date.textContent = "Enviado em " + fmtDate(e.created_at);

      card.appendChild(top);
      card.appendChild(meta);
      card.appendChild(exp);
      card.appendChild(date);
      list.appendChild(card);
    });
  }

  function loadEntries() {
    return api("/api/team-admin", { key: savedKey }).then(function (d) {
      if (!d.ok) throw d;
      renderEntries(d.entries || []);
    });
  }

  $("fa-keyform").addEventListener("submit", function (e) {
    e.preventDefault();
    var key = $("fa-key").value.trim();
    if (!key) return setKeyMsg("Digite a chave de acesso.");
    var go = $("fa-go");
    go.disabled = true;
    setKeyMsg("");

    savedKey = key;
    loadEntries().then(function () {
      $("fa-key").value = "";
      $("fa-lock").hidden = true;
      $("fa-panel").hidden = false;
      $("fa-exit").hidden = false;
    }).catch(function (d) {
      savedKey = null;
      go.disabled = false;
      setKeyMsg((d && d.error) || "Não foi possível entrar. Tente de novo.");
    });
  });

  $("fa-refresh").addEventListener("click", function () {
    loadEntries().catch(function () {
      // se a chave parar de funcionar (ex.: trocada no servidor), volta pra tela de chave
      savedKey = null;
      $("fa-panel").hidden = true;
      $("fa-exit").hidden = true;
      $("fa-lock").hidden = false;
      $("fa-go").disabled = false;
      setKeyMsg("Sessão expirada. Digite a chave novamente.");
    });
  });

  $("fa-exit").addEventListener("click", function () {
    savedKey = null;
    $("fa-panel").hidden = true;
    $("fa-exit").hidden = true;
    $("fa-lock").hidden = false;
    $("fa-go").disabled = false;
    setKeyMsg("");
  });
})();
