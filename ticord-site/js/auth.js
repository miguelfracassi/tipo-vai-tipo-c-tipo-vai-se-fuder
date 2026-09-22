/* =========================================================
   TICORD — login, cadastro e conta (servidor)
   ========================================================= */
(function () {
  "use strict";

  function api(path, body) {
    var opt = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body) { opt.method = "POST"; opt.body = JSON.stringify(body); }
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; return d; });
    });
  }
  var slot = document.querySelector("[data-auth-slot]");
  var state = { user: null, profile: null };
  var mode = "login";

  /* ---------- Sessão ---------- */
  function refresh() {
    return api("/api/me").then(function (d) {
      state.user = d.user ? { email: d.user.email } : null;
      state.profile = d.user || null;
      renderSlot();
      window.dispatchEvent(new Event("ticord-auth"));
    }).catch(function () { renderSlot(); });
  }

  function firstName() {
    return (state.profile && state.profile.first_name) || "Minha conta";
  }

  /* ---------- Botão no cabeçalho ---------- */
  function renderSlot() {
    if (!slot) return;
    slot.textContent = "";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "auth-btn";

    if (!state.user) {
      btn.textContent = "Entrar";
      btn.addEventListener("click", function () { openModal("login"); });
      slot.appendChild(btn);
      return;
    }

    btn.textContent = firstName();
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    var menu = document.createElement("div");
    menu.className = "auth-menu";
    menu.hidden = true;

    if (state.profile && state.profile.is_client) {
      var dash = document.createElement("a");
      dash.href = "dashboard.html";
      dash.textContent = "Dashboard";
      menu.appendChild(dash);
    } else {
      var note = document.createElement("div");
      note.className = "auth-note";
      note.textContent = "O dashboard é exclusivo para clientes.";
      menu.appendChild(note);
    }

    var out = document.createElement("button");
    out.type = "button";
    out.textContent = "Sair";
    out.addEventListener("click", function () {
      api("/api/logout", {}).then(refresh).then(function () {
        if (/dashboard/.test(location.pathname)) location.href = "index.html";
      });
    });
    menu.appendChild(out);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
    slot.appendChild(btn);
    slot.appendChild(menu);
  }

  document.addEventListener("click", function (e) {
    var menu = slot && slot.querySelector(".auth-menu");
    if (menu && !slot.contains(e.target)) menu.hidden = true;
  });

  /* ---------- Janela de login / cadastro ---------- */
  var modal = document.createElement("div");
  modal.className = "auth-modal";
  modal.hidden = true;
  modal.innerHTML =
    '<div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
    '<button type="button" class="auth-close" aria-label="Fechar">&times;</button>' +
    '<h2 id="auth-title"></h2><p class="auth-sub"></p>' +
    '<form class="auth-form" novalidate>' +
    '<div class="auth-row" data-signup-only>' +
    '<label class="auth-field">Primeiro nome<input name="first" type="text" autocomplete="given-name" required></label>' +
    '<label class="auth-field">Sobrenome<input name="last" type="text" autocomplete="family-name" required></label>' +
    '</div>' +
    '<label class="auth-field">Email<input name="email" type="email" autocomplete="email" required></label>' +
    '<label class="auth-field">Senha<input name="password" type="password" minlength="8" required></label>' +
    '<p class="auth-msg" role="alert"></p>' +
    '<button type="submit" class="btn btn-primary"></button>' +
    '</form>' +
    '<p class="auth-switch"><span class="auth-switch-text"></span> <button type="button" class="link-quiet auth-switch-btn"></button></p>' +
    '</div>';
  document.body.appendChild(modal);

  var form = modal.querySelector("form");
  var msg = modal.querySelector(".auth-msg");
  var submitBtn = form.querySelector("button[type=submit]");
  var signupOnly = form.querySelector("[data-signup-only]");

  function setMsg(text, ok) {
    msg.textContent = text || "";
    msg.className = "auth-msg" + (ok ? " ok" : "");
  }

  function setMode(m) {
    mode = m;
    var signup = m === "signup";
    modal.querySelector("#auth-title").textContent = signup ? "Criar conta" : "Entrar";
    modal.querySelector(".auth-sub").textContent = signup
      ? "Preencha seus dados para criar sua conta na Ticord."
      : "Use seu email e senha para acessar sua conta.";
    submitBtn.textContent = signup ? "Criar conta" : "Entrar";
    modal.querySelector(".auth-switch-text").textContent = signup ? "Já tem uma conta?" : "Ainda não tem conta?";
    modal.querySelector(".auth-switch-btn").textContent = signup ? "Entrar" : "Criar conta";
    signupOnly.hidden = !signup;
    signupOnly.querySelectorAll("input").forEach(function (i) { i.disabled = !signup; });
    form.password.setAttribute("autocomplete", signup ? "new-password" : "current-password");
    setMsg("");
  }

  function openModal(m) {
    setMode(m || "login");
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    setTimeout(function () { (mode === "signup" ? form.first : form.email).focus(); }, 30);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("no-scroll");
    form.reset();
    setMsg("");
  }

  modal.querySelector(".auth-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  modal.querySelector(".auth-switch-btn").addEventListener("click", function () {
    setMode(mode === "login" ? "signup" : "login");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) return setMsg("Preencha todos os campos corretamente (senha com 8+ caracteres).");
    var signup = mode === "signup";
    var body = { email: form.email.value.trim(), password: form.password.value };
    if (signup) { body.first_name = form.first.value.trim(); body.last_name = form.last.value.trim(); }
    submitBtn.disabled = true;
    setMsg("");
    api(signup ? "/api/register" : "/api/login", body).then(function (d) {
      submitBtn.disabled = false;
      if (!d.ok) return setMsg(d.error || "Não foi possível concluir. Tente novamente.");
      closeModal();
      return refresh();
    }).catch(function () {
      submitBtn.disabled = false;
      setMsg("Não foi possível concluir. Tente novamente.");
    });
  });

  /* ---------- Início ---------- */
  var ready = refresh();

  window.TicordAuth = {
    ready: ready,
    getState: function () { return state; },
    openLogin: function () { openModal("login"); },
    openSignup: function () { openModal("signup"); }
  };
})();
