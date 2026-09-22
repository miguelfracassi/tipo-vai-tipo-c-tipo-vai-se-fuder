(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  var VIEWS = ["v-load", "v-auth", "v-plan", "v-pix", "v-done"];
  var mode = "login", timer = null, user = null, renewMode = false;
  var KEY = document.body.getAttribute("data-plan") || "anual";

  function api(path, body) {
    var opt = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body) { opt.method = "POST"; opt.body = JSON.stringify(body); }
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; return d; });
    });
  }
  function show(id) { VIEWS.forEach(function (v) { $(v).hidden = v !== id; }); }
  function fmt(d) {
    var dt = new Date(d);
    return KEY === "diario" ? dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : dt.toLocaleDateString("pt-BR");
  }
  function done(title, text) {
    $("done-title").textContent = title;
    $("done-text").textContent = text;
    show("v-done");
  }

  /* ---------- Fluxo principal ---------- */
  function start() {
    clearInterval(timer);
    show("v-load");
    api("/api/me").then(function (d) {
      user = d.user || null;
      $("logout").hidden = !user;
      if (!user) return show("v-auth");
      return api("/api/plans").then(route);
    }).catch(function () {
      done("Algo deu errado", "Não foi possível carregar. Atualize a página.");
    });
  }

  function route(d) {
    var plan = (d.plans || []).filter(function (p) { return p.plan_key === KEY; })[0];
    renewMode = false;
    $("hello").textContent = "Olá, " + user.first_name + "!";
    $("sub").textContent = "Escolha o melhor plano de andfopportunity.com";
    $("pay-msg").textContent = "";
    if (plan) {
      if (!plan.can_renew) {
        return done("Você já tem este plano", "Plano " + plan.name + " ativo até " + fmt(plan.expires_at) + ". A renovação fica disponível a partir dessa data.");
      }
      renewMode = true;
      $("sub").textContent = "Renove seu plano de andfopportunity.com";
    }
    show("v-plan");
  }

  /* ---------- Login / cadastro ---------- */
  var form = $("f");
  function setMsg(t) { $("auth-msg").textContent = t || ""; }
  function setMode(m) {
    mode = m;
    var s = m === "signup";
    $("signup-only").hidden = !s;
    $("signup-only").querySelectorAll("input").forEach(function (i) { i.disabled = !s; });
    $("auth-submit").textContent = s ? "Criar conta" : "Entrar";
    $("switch-text").textContent = s ? "Já tem uma conta?" : "Ainda não tem conta?";
    $("switch-btn").textContent = s ? "Entrar" : "Criar conta";
    form.password.setAttribute("autocomplete", s ? "new-password" : "current-password");
    setMsg("");
  }
  $("switch-btn").addEventListener("click", function () { setMode(mode === "login" ? "signup" : "login"); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) return setMsg("Preencha todos os campos corretamente (senha com 8+ caracteres).");
    var signup = mode === "signup";
    var body = { email: form.email.value.trim(), password: form.password.value };
    if (signup) { body.first_name = form.first.value.trim(); body.last_name = form.last.value.trim(); }
    $("auth-submit").disabled = true;
    setMsg("");
    api(signup ? "/api/register" : "/api/login", body).then(function (d) {
      $("auth-submit").disabled = false;
      if (!d.ok) return setMsg(d.error || "Não foi possível concluir. Tente novamente.");
      form.reset();
      start();
    }).catch(function () {
      $("auth-submit").disabled = false;
      setMsg("Não foi possível concluir. Tente novamente.");
    });
  });

  $("logout").addEventListener("click", function () {
    api("/api/logout", {}).then(start);
  });

  /* ---------- Pix ---------- */
  $("pay").addEventListener("click", function () {
    $("pay").disabled = true;
    $("pay-msg").textContent = "";
    api("/api/plan-pay", { renew: renewMode, plan: KEY }).then(function (d) {
      $("pay").disabled = false;
      if (!d.ok) { $("pay-msg").textContent = d.error || "Não foi possível gerar o Pix."; return; }
      var qrWrap = $("qr-wrap"), qrImg = $("qr");
      qrWrap.classList.remove("is-ready");
      qrImg.onload = function () { qrWrap.classList.add("is-ready"); };
      qrImg.src = "data:image/png;base64," + d.qr_base64;
      $("code").value = d.qr_code;
      show("v-pix");
      poll();
    }).catch(function () {
      $("pay").disabled = false;
      $("pay-msg").textContent = "Não foi possível gerar o Pix. Tente novamente.";
    });
  });

  $("copy").addEventListener("click", function () {
    var btn = $("copy"), t = $("code");
    function ok() { btn.textContent = "Copiado!"; setTimeout(function () { btn.textContent = "Copiar código"; }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t.value).then(ok, function () { t.select(); document.execCommand("copy"); ok(); });
    } else { t.select(); document.execCommand("copy"); ok(); }
  });

  function poll() {
    clearInterval(timer);
    timer = setInterval(function () {
      api("/api/plan-status").then(function (d) {
        if (d.status === "approved") {
          clearInterval(timer);
          done("Pagamento confirmado!", "Seu plano foi liberado. Acesse o dashboard para ver os detalhes.");
        } else if (["cancelled", "rejected", "expired", "failed"].indexOf(d.status) > -1) {
          clearInterval(timer);
          show("v-plan");
          $("pay-msg").textContent = "Esse Pix expirou ou foi recusado. Gere um novo.";
        }
      });
    }, 5000);
  }

  setMode("login");
  start();
})();
