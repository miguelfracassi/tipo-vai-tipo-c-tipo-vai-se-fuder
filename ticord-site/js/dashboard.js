/* Dashboard: mostra o conteúdo só para clientes */
(function () {
  "use strict";
  var A = window.TicordAuth;
  if (!A) return;

  function $(id) { return document.getElementById(id); }

  function show(which) {
    ["dash-loading", "dash-gate", "dash-denied", "dash-content"].forEach(function (id) {
      $(id).hidden = id !== which;
    });
  }

  function render() {
    var s = A.getState();
    if (!s.user) return show("dash-gate");
    if (!s.profile || !s.profile.is_client) return show("dash-denied");
    $("dash-name").textContent = s.profile.first_name;
    $("dash-fullname").textContent = s.profile.first_name + " " + s.profile.last_name;
    $("dash-email").textContent = s.user.email;
    show("dash-content");
    loadPlans();
  }

  var plansLoaded = false;
  function fmt(d, key) {
    var dt = new Date(d);
    return key === "diario" ? dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : dt.toLocaleDateString("pt-BR");
  }

  function loadPlans() {
    if (plansLoaded) return;
    plansLoaded = true;
    var box = $("dash-plans");
    fetch("/api/plans", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        box.textContent = "";
        var plans = d.plans || [];
        if (!plans.length) {
          var none = document.createElement("p");
          none.className = "lead";
          none.textContent = "Nenhum plano ativo no momento.";
          box.appendChild(none);
          return;
        }
        plans.forEach(function (p) {
          var item = document.createElement("div");
          item.className = "dash-plan";

          var name = document.createElement("p");
          name.className = "dash-value";
          name.textContent = "Plano " + p.name;
          item.appendChild(name);

          var until = document.createElement("p");
          until.className = "dash-label";
          until.style.marginTop = "4px";
          until.textContent = (p.can_renew ? "Venceu em " : "Ativo até ") + fmt(p.expires_at, p.plan_key);
          item.appendChild(until);

          if (p.can_renew) {
            var a = document.createElement("a");
            a.className = "btn btn-primary";
            a.href = (p.page || "andfopportunity") + "?renovar=1";
            a.textContent = "Renovar";
            item.appendChild(a);
          } else {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "btn btn-ghost";
            b.disabled = true;
            b.textContent = "Renovar";
            item.appendChild(b);
            var hint = document.createElement("p");
            hint.className = "dash-label";
            hint.textContent = "A renovação fica disponível em " + fmt(p.expires_at, p.plan_key) + ".";
            item.appendChild(hint);
          }
          box.appendChild(item);
        });
      })
      .catch(function () { box.textContent = "Não foi possível carregar seus planos."; });
  }

  $("dash-login").addEventListener("click", A.openLogin);
  A.ready.then(render);
  window.addEventListener("ticord-auth", render);
})();
