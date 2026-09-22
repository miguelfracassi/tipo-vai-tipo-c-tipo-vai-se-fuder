/* =========================================================
   TICORD — interatividade visual
   Cursor com brilho, revelação ao rolar, ondulação nos botões
   e leve inclinação 3D nos cartões. Tudo respeita
   prefers-reduced-motion e não depende de bibliotecas externas.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  /* ---------- Fundo ambiente + cursor com brilho ---------- */
  if (!document.querySelector(".bg-fx")) {
    var bg = document.createElement("div");
    bg.className = "bg-fx";
    bg.setAttribute("aria-hidden", "true");
    bg.innerHTML = "<span></span><span></span><span></span>";
    document.body.insertBefore(bg, document.body.firstChild);
  }

  if (canHover && !reduceMotion) {
    var glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    var gx = 0, gy = 0, tx = 0, ty = 0, raf = null;

    function loop() {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      glow.style.transform = "translate(" + gx + "px," + gy + "px)";
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add("is-active");
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    window.addEventListener("mouseleave", function () { glow.classList.remove("is-active"); });
  }

  /* ---------- Revelação ao rolar ---------- */
  var revealSelectors = [
    ".hero h1", ".hero .lead", ".hero .btn-row", ".brand-cell",
    ".section-head", ".row", ".project", ".future", ".admin-card",
    ".join-band", ".structure", ".structure-item", ".support-card",
    ".cta-band", ".dash-card", ".plan-card", ".prose p"
  ];
  var targets = document.querySelectorAll(revealSelectors.join(","));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("reveal", "in-view"); });
  } else {
    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i % 6, 5) * 0.06 + "s";
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el) { obs.observe(el); });

    /* Rede de segurança: cobre saltos instantâneos de rolagem (tecla
       End, links âncora, "voltar ao topo") onde o IntersectionObserver
       pode não computar todos os estados intermediários. */
    var pending = Array.prototype.slice.call(targets);
    function sweep() {
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        var visible = r.top < window.innerHeight * 0.96 && r.bottom > 0;
        if (visible) { el.classList.add("in-view"); return false; }
        return true;
      });
    }
    var sweepTicking = false;
    function onScrollOrResize() {
      if (sweepTicking) return;
      sweepTicking = true;
      requestAnimationFrame(function () { sweep(); sweepTicking = false; });
    }
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    sweep();
  }

  /* ---------- Ondulação (ripple) nos botões ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn, .auth-btn");
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.4;
    var span = document.createElement("span");
    span.className = "ripple";
    span.style.width = span.style.height = size + "px";
    span.style.left = (e.clientX - rect.left - size / 2) + "px";
    span.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(span);
    span.addEventListener("animationend", function () { span.remove(); });
  });

  /* ---------- Leve inclinação 3D em cartões ---------- */
  if (canHover && !reduceMotion) {
    var tiltEls = document.querySelectorAll(".brand-cell, .project-logo, .dash-card, .structure-item");
    tiltEls.forEach(function (el) {
      el.classList.add("tilt");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(600px) rotateX(" + (py * -6) + "deg) rotateY(" + (px * 6) + "deg)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }
})();
