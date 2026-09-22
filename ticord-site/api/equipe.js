/* =========================================================
   TICORD — formulário de inscrição do time (/equipe)
   Arquivo próprio: não depende de js/auth.js do site.
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

  var form = $("team-form");
  var msg = $("tf-msg");
  var submitBtn = $("tf-submit");

  function setMsg(text, ok) {
    msg.textContent = text || "";
    msg.className = "auth-msg" + (ok ? " ok" : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var body = {
      role: $("tf-role").value,
      full_name: $("tf-name").value.trim(),
      email: $("tf-email").value.trim(),
      phone: $("tf-phone").value.trim(),
      experience: $("tf-exp").value.trim(),
      password: $("tf-pw").value,
      password_confirm: $("tf-pw2").value
    };

    if (!form.checkValidity()) {
      return setMsg("Preencha todos os campos corretamente.");
    }
    if (body.password !== body.password_confirm) {
      return setMsg("As senhas não coincidem.");
    }

    submitBtn.disabled = true;
    setMsg("");

    api("/api/team-apply", body).then(function (d) {
      submitBtn.disabled = false;
      if (!d.ok) return setMsg(d.error || "Não foi possível enviar. Tente novamente.");

      $("team-form-box").hidden = true;
      var success = $("team-success");
      success.hidden = false;
      $("ts-text").textContent =
        "Sua conta foi criada com o email " + (d.application && d.application.email ? d.application.email : "informado") +
        " e sua inscrição para " + (d.application && d.application.role_label ? d.application.role_label : "o time") +
        " já está com a equipe da Ticord.";
    }).catch(function () {
      submitBtn.disabled = false;
      setMsg("Erro de conexão. Tente novamente.");
    });
  });
})();
