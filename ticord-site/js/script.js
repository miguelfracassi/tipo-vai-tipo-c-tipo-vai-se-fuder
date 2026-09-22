/* =========================================================
   TICORD — script principal
   JavaScript puro, sem dependências.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Header: muda o fundo quando a página é rolada
     --------------------------------------------------------- */
  var header = document.querySelector(".site-header");

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 20) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     2. Menu mobile
     --------------------------------------------------------- */
  var menuBtn = document.querySelector(".menu-btn");
  var mobileNav = document.querySelector(".mobile-nav");

  function closeMenu() {
    if (!menuBtn || !mobileNav) return;
    menuBtn.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", open ? "false" : "true");
      mobileNav.classList.toggle("is-open", !open);
      document.body.classList.toggle("no-scroll", !open);
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Se a tela voltar ao tamanho de desktop, fecha o menu
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeMenu();
    });
  }

  /* ---------------------------------------------------------
     3. Marca o link da página atual na navegação
     --------------------------------------------------------- */
  var current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a, .mobile-nav a").forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href) return;
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("is-active");
    }
  });

  /* ---------------------------------------------------------
     4. Página de apoio: redirecionamento automático
     ---------------------------------------------------------
     Para alterar o destino, mude o atributo data-redirect no
     elemento #auto-redirect dentro de apoio.html.
     Para alterar o tempo, mude data-seconds no mesmo elemento.
     --------------------------------------------------------- */
  var redirectBox = document.getElementById("auto-redirect");

  if (redirectBox) {
    var url = redirectBox.getAttribute("data-redirect");
    var seconds = parseInt(redirectBox.getAttribute("data-seconds"), 10) || 10;
    var counter = redirectBox.querySelector(".countdown");
    var cancelBtn = redirectBox.querySelector(".cancel-redirect");
    var timer = null;

    function tick() {
      seconds -= 1;
      if (counter) counter.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        window.location.href = url;
      }
    }

    if (counter) counter.textContent = seconds;
    timer = setInterval(tick, 1000);

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        clearInterval(timer);
        redirectBox.textContent = "Redirecionamento cancelado. Use o botão acima quando quiser abrir a central de apoio.";
      });
    }
  }

  /* ---------------------------------------------------------
     5. Ano atual no rodapé
     --------------------------------------------------------- */
  document.querySelectorAll(".year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
