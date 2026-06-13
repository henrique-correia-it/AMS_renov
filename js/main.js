/* =========================================================
   AMS_Renov — interactions
   GSAP (reveals, scroll, hero intro) + Three.js (hero 3D)
   ========================================================= */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasThree = typeof window.THREE !== "undefined";

  /* ---------------------------------------------------------
     0. Footer year
  --------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     1. THREE.JS — endless tunnel of architectural frames
        (room outlines / doorframes receding into depth)
  --------------------------------------------------------- */
  function initThree() {
    if (!hasThree || prefersReduced) return;
    const canvas = document.getElementById("heroCanvas");
    if (!canvas) return;

    const THREE = window.THREE;
    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const group = new THREE.Group();
    scene.add(group);

    // Rectangle outline (room proportion) — clean 4-edge frame, no diagonal
    const rectGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.1, 2.05));
    const goldColor = new THREE.Color(0xB5903C);
    const inkColor = new THREE.Color(0x1d1a14);

    const COUNT = 18;
    const SPAN = 15;          // total depth of the tunnel
    const NEAR = camera.position.z; // frames recycle once they pass this
    const frames = [];

    for (let i = 0; i < COUNT; i++) {
      const mat = new THREE.LineBasicMaterial({
        color: i % 5 === 0 ? inkColor : goldColor,
        transparent: true, opacity: 0,
      });
      const line = new THREE.LineSegments(rectGeo, mat);
      line.position.z = NEAR - 0.6 - (i / COUNT) * SPAN;
      group.add(line);
      frames.push(line);
    }

    // Two soft surface planes for a hint of depth/material
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), planeMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6;
    group.add(floor);

    function smoothstep(a, b, x) {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    // Layout per screen size
    function placeGroup() {
      if (width < 760) { group.position.set(0, -0.1, 0); }
      else             { group.position.set(1.9, 0.1, 0); }
    }
    placeGroup();

    // Mouse parallax
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    let intro = 0; // 0..1 fade-in on load
    if (hasGSAP) window.gsap.to({ v: 0 }, { v: 1, duration: 2.4, ease: "power2.out", delay: 0.3, onUpdate: function () { intro = this.targets()[0].v; } });
    else intro = 1;

    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

    const clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // smooth mouse follow
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      frames.forEach((f) => {
        // travel toward the camera, recycle to the back
        f.position.z += dt * 1.1;
        if (f.position.z > NEAR - 0.2) f.position.z -= SPAN;

        const dist = NEAR - f.position.z;                 // 0 (near) .. SPAN (far)
        const fadeNear = smoothstep(0.3, 2.4, dist);
        const fadeFar = 1 - smoothstep(SPAN - 4, SPAN, dist);
        const base = f.material.color.equals(inkColor) ? 0.55 : 0.85;
        f.material.opacity = fadeNear * fadeFar * base * intro;

        // gentle swirl based on depth + time
        f.rotation.z = f.position.z * 0.16 + t * 0.05;
      });

      group.rotation.y = current.x * 0.28;
      group.rotation.x = -current.y * 0.16;

      renderer.render(scene, camera);
    }
    tick();

    function onResize() {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      placeGroup();
    }
    window.addEventListener("resize", onResize);
  }

  /* ---------------------------------------------------------
     2. PRELOADER + hero intro (GSAP)
  --------------------------------------------------------- */
  function runIntro() {
    const preloader = document.getElementById("preloader");
    const fill = document.getElementById("preloaderFill");
    const pct = document.getElementById("preloaderPct");

    const finish = () => {
      if (preloader) preloader.style.display = "none";
      revealHero();
    };

    if (!hasGSAP || prefersReduced) {
      let p = 0;
      const iv = setInterval(() => {
        p = Math.min(100, p + 8);
        if (fill) fill.style.width = p + "%";
        if (pct) pct.textContent = String(p).padStart(2, "0");
        if (p >= 100) { clearInterval(iv); finish(); }
      }, 60);
      return;
    }

    const gsap = window.gsap;
    const counter = { v: 0 };
    gsap.timeline()
      .to(counter, {
        v: 100, duration: 1.4, ease: "power2.inOut",
        onUpdate: () => {
          const val = Math.round(counter.v);
          if (fill) fill.style.width = val + "%";
          if (pct) pct.textContent = String(val).padStart(2, "0");
        },
      })
      .to("#preloader .preloader__inner", { y: -20, opacity: 0, duration: 0.6, ease: "power2.in" }, "+=0.15")
      .to("#preloader", {
        yPercent: -100, duration: 0.9, ease: "power4.inOut",
        onComplete: () => { if (preloader) preloader.style.display = "none"; },
      }, "-=0.2")
      .add(revealHero, "-=0.5");
  }

  function revealHero() {
    if (!hasGSAP || prefersReduced) {
      document.documentElement.classList.remove("js-ready");
      return;
    }
    const gsap = window.gsap;
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .to(".hero__eyebrow", { y: 0, opacity: 1, duration: 0.7 })
      .to(".hero__title .line > span", { y: 0, duration: 1.1, stagger: 0.09 }, "-=0.4")
      .to(".hero__subtitle", { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
      .to(".hero__actions", { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
      .to(".hero__scroll", { y: 0, opacity: 1, duration: 0.8 }, "-=0.6");
  }

  /* ---------------------------------------------------------
     3. Scroll reveals + section animations (ScrollTrigger)
  --------------------------------------------------------- */
  function initScrollAnimations() {
    if (!hasGSAP || prefersReduced) return;
    const gsap = window.gsap;
    if (!window.ScrollTrigger) {
      document.documentElement.classList.remove("js-ready");
      return;
    }
    gsap.registerPlugin(window.ScrollTrigger);

    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });

    gsap.utils.toArray(".reveal-up").forEach((el) => {
      if (el.closest(".hero")) return;
      gsap.to(el, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });

    gsap.utils.toArray(".services__grid .card").forEach((card, i) => {
      gsap.fromTo(card,
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 92%" }, delay: (i % 3) * 0.06 }
      );
    });

    gsap.utils.toArray("[data-count]").forEach((el) => {
      const end = parseFloat(el.getAttribute("data-count"));
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: () => { el.textContent = Math.round(obj.v); },
      });
    });

    gsap.utils.toArray("[data-parallax] img").forEach((img) => {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    gsap.to(".hero__grid", {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  /* ---------------------------------------------------------
     4. Navbar — scrolled state, hide on scroll, mobile menu
  --------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById("nav");
    const burger = document.getElementById("navBurger");
    const links = document.getElementById("navLinks");
    const overlay = document.getElementById("navOverlay");
    const closeBtn = document.getElementById("navClose");
    if (!nav) return;

    let lastY = 0;
    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 40);
      if (y > lastY && y > 400 && !nav.classList.contains("menu-open")) nav.classList.add("hidden");
      else nav.classList.remove("hidden");
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function openMenu() {
      nav.classList.remove("hidden"); // clear any scroll-hide transform so the panel anchors to the viewport
      nav.classList.add("menu-open");
      document.body.classList.add("menu-open");
      if (burger) burger.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      nav.classList.remove("menu-open");
      document.body.classList.remove("menu-open");
      if (burger) burger.setAttribute("aria-expanded", "false");
    }
    function toggleMenu() {
      if (nav.classList.contains("menu-open")) closeMenu(); else openMenu();
    }

    if (burger) burger.addEventListener("click", toggleMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    if (overlay) overlay.addEventListener("click", closeMenu);
    if (links) links.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    // Reset menu state if resized to desktop
    window.addEventListener("resize", () => { if (window.innerWidth > 860) closeMenu(); });
  }

  /* ---------------------------------------------------------
     5. Language toggle (PT ⇄ FR)
  --------------------------------------------------------- */
  function initLang() {
    const toggle = document.getElementById("langToggle");
    if (!toggle) return;

    const textEls = Array.from(document.querySelectorAll("[data-fr]"));
    const htmlEls = Array.from(document.querySelectorAll("[data-fr-html]"));
    // Capture Portuguese defaults
    textEls.forEach((el) => { el.dataset.pt = el.innerHTML; });
    htmlEls.forEach((el) => { el.dataset.ptHtml = el.innerHTML; });

    let lang = "pt";

    function setLang(next) {
      if (next === lang) return;
      lang = next;
      document.documentElement.lang = next;

      textEls.forEach((el) => {
        el.innerHTML = next === "fr" ? el.getAttribute("data-fr") : el.dataset.pt;
      });
      htmlEls.forEach((el) => {
        el.innerHTML = next === "fr" ? el.getAttribute("data-fr-html") : el.dataset.ptHtml;
      });

      // Re-reveal hero title lines (their span nodes were replaced)
      if (hasGSAP && !prefersReduced) window.gsap.set(".hero__title .line > span", { y: 0 });

      toggle.querySelectorAll(".nav__lang-opt").forEach((o) => {
        o.classList.toggle("is-active", o.dataset.lang === next);
      });
    }

    toggle.addEventListener("click", () => setLang(lang === "pt" ? "fr" : "pt"));
  }

  /* ---------------------------------------------------------
     6. Custom cursor + magnetic buttons
  --------------------------------------------------------- */
  function initCursor() {
    const cursor = document.getElementById("cursor");
    if (!cursor || !hasGSAP || window.matchMedia("(hover: none)").matches) return;
    const gsap = window.gsap;
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.4, ease: "power3" });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });

    document.querySelectorAll("a, button, [data-magnetic], .card, .gallery__item").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });
  }

  function initMagnetic() {
    if (!hasGSAP || window.matchMedia("(hover: none)").matches) return;
    const gsap = window.gsap;
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.32;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: mx * strength, y: my * strength, duration: 0.5, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ---------------------------------------------------------
     7. Contact form (demo — no backend)
  --------------------------------------------------------- */
  function initForm() {
    const form = document.getElementById("contactForm");
    const note = document.getElementById("formNote");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = form.nome.value.trim();
      const tel = form.telefone.value.trim();
      const fr = document.documentElement.lang === "fr";
      if (!nome || !tel) {
        if (note) { note.textContent = fr ? "Veuillez indiquer votre nom et votre téléphone." : "Por favor preencha o nome e o telefone."; note.style.color = "#b4452f"; }
        return;
      }
      if (note) {
        const first = nome.split(" ")[0];
        note.textContent = fr
          ? "Merci, " + first + " ! Votre demande a été enregistrée. Nous vous recontactons bientôt."
          : "Obrigado, " + first + "! O seu pedido foi registado. Entraremos em contacto em breve.";
        note.style.color = "var(--gold)";
      }
      form.reset();
      if (hasGSAP) window.gsap.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
    });
  }

  /* ---------------------------------------------------------
     8. Image fallbacks (remote images may fail offline)
  --------------------------------------------------------- */
  function initImageFallbacks() {
    document.querySelectorAll(".gallery__item img").forEach((img) => {
      img.addEventListener("error", () => img.parentElement.classList.add("is-broken"));
      if (img.complete && img.naturalWidth === 0) img.parentElement.classList.add("is-broken");
    });
    const interiorsImg = document.querySelector(".interiors__img");
    if (interiorsImg) {
      const m = getComputedStyle(interiorsImg).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1]) {
        const probe = new Image();
        probe.onerror = () => interiorsImg.classList.add("is-broken");
        probe.src = m[1];
      }
    }
  }

  /* ---------------------------------------------------------
     9. Smooth anchor scrolling
  --------------------------------------------------------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      });
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  function boot() {
    if (hasGSAP && !prefersReduced) document.documentElement.classList.add("js-ready");

    initThree();
    runIntro();
    initNav();
    initLang();
    initCursor();
    initMagnetic();
    initForm();
    initImageFallbacks();
    initAnchors();

    window.addEventListener("load", () => {
      initScrollAnimations();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });

    // Safety: never leave content hidden if something fails
    setTimeout(() => {
      const pl = document.getElementById("preloader");
      if (pl && getComputedStyle(pl).display !== "none") {
        pl.style.display = "none";
        document.documentElement.classList.remove("js-ready");
      }
    }, 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
