// Stepicon 2026 — interactions.
// (This script lives at the end of <body>, so the DOM is already parsed.)

/* --- Mobile burger menu (always runs, independent of GSAP/reduced-motion) --- */
(function () {
  var burger = document.querySelector(".topbar__burger");
  var menu = document.getElementById("menu");
  if (!burger || !menu) return;
  var closeBtn = menu.querySelector(".menu__close");

  function setOpen(open) {
    menu.classList.toggle("menu--open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.classList.toggle("menu-open", open);
    // pause/resume smooth scroll if Lenis is running
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  }

  burger.addEventListener("click", function () { setOpen(true); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
  // close when a menu link is tapped
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setOpen(false); });
  });
  // close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();

/* --- Header reveal: hide on scroll-down, show on scroll-up (all viewports).
       Independent of GSAP/Lenis — reads the real scroll position, which Lenis
       drives natively, so it works with or without smooth scroll. ----------- */
(function () {
  var header = document.querySelector(".topbar");
  if (!header) return;
  var lastY = window.pageYOffset || 0;
  var ticking = false;
  function update() {
    var y = window.pageYOffset || 0;
    if (y <= 4) {
      // at the very top (over the hero) → always visible, no backing
      header.classList.remove("topbar--hidden");
      header.classList.remove("topbar--solid");
    } else {
      header.classList.add("topbar--solid");
      if (y > lastY + 6 && y > 80) {
        header.classList.add("topbar--hidden"); // scrolling down
      } else if (y < lastY - 6) {
        header.classList.remove("topbar--hidden"); // scrolling up
      }
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
})();

/* --- Smooth-scroll for in-page anchor links (topbar + burger menu) --------
   Reads window.__lenis lazily at click time so it works regardless of init
   order; falls back to native smooth scroll when Lenis isn't running. ------ */
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var hash = link.getAttribute("href");
      if (!hash || hash === "#") {
        // bare "#": logos go back to top; other placeholders (e.g. "Ссылка
        // скоро") just do nothing rather than jumping the page.
        e.preventDefault();
        if (/logo/.test(link.className)) {
          if (window.__lenis) window.__lenis.scrollTo(0);
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
      var target = document.querySelector(hash);
      if (!target) return; // let the browser handle unknown anchors
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

/* --- Place: photo slider (prev/next, wraps around) — desktop arrows.
       On mobile the same markup becomes a plain horizontal scroll (CSS). ---- */
(function () {
  var slider = document.querySelector(".place__slider");
  if (!slider) return;
  var track = slider.querySelector(".place__track");
  if (!track) return;
  var count = track.children.length;
  var prev = document.querySelector(".place__nav--prev");
  var next = document.querySelector(".place__nav--next");
  var i = 0;

  /* Mobile dots: built here so the count always matches the slides. They're
     hidden on desktop via CSS; on mobile they reflect the native scroll. */
  var dotsWrap = document.querySelector(".place__dots");
  var dots = [];
  if (dotsWrap) {
    for (var d = 0; d < count; d++) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "place__dot" + (d === 0 ? " place__dot--active" : "");
      dot.setAttribute("aria-label", "Фото " + (d + 1));
      (function (idx) {
        dot.addEventListener("click", function () {
          slider.scrollTo({
            left: idx * (track.children[0] ? track.children[0].offsetWidth : 0),
            behavior: "smooth",
          });
        });
      })(d);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
  }
  function setActive(idx) {
    for (var k = 0; k < dots.length; k++) {
      dots[k].classList.toggle("place__dot--active", k === idx);
    }
  }

  function go(n) {
    i = (n + count) % count;
    track.style.transform = "translateX(" + -i * 100 + "%)";
    setActive(i);
  }
  if (prev) prev.addEventListener("click", function () { go(i - 1); });
  if (next) next.addEventListener("click", function () { go(i + 1); });

  /* Track the mobile horizontal scroll → light up the matching dot. */
  var ticking = false;
  slider.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var w = track.children[0] ? track.children[0].offsetWidth : 1;
      var idx = Math.round(slider.scrollLeft / w);
      if (idx < 0) idx = 0;
      if (idx > count - 1) idx = count - 1;
      setActive(idx);
      ticking = false;
    });
  });
})();

/* --- FAQ accordion ------------------------------------------------------- */
(function () {
  var items = document.querySelectorAll(".faq__item");
  if (!items.length) return;
  items.forEach(function (item) {
    var btn = item.querySelector(".faq__q");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = item.classList.toggle("faq__item--open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
})();

/* --- Program day switcher: highlights the tab and swaps the day's content -- */
(function () {
  var sw = document.querySelector(".switcher");
  if (!sw) return;
  var btns = Array.prototype.slice.call(sw.querySelectorAll(".switcher__btn"));
  var days = Array.prototype.slice.call(document.querySelectorAll(".program__day"));
  btns.forEach(function (btn, i) {
    btn.addEventListener("click", function () {
      btns.forEach(function (b) {
        b.classList.remove("switcher__btn--active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("switcher__btn--active");
      btn.setAttribute("aria-selected", "true");
      // show the matching day panel, hide the others
      days.forEach(function (day, j) {
        day.hidden = j !== i;
      });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  });
})();

// Hero intro animation: plays once on load (title/subtitle/plates reveal,
// lines draw on, stars drift), plus scroll parallax and the scroll-driven
// section lines.
(function () {
  if (typeof window.gsap === "undefined") return;

  // Respect reduced-motion preference: leave everything visible, no animation.
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  /* --- Smooth scroll (Lenis) synced with ScrollTrigger --------------------
     Lenis smooths the scroll position; ScrollTrigger reads from it, so any
     scroll-driven animation (the parallax below) becomes buttery and modern.
     Pattern per Lenis docs: drive lenis.raf from GSAP's ticker. */
  if (window.Lenis && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    var lenis = new Lenis({
      lerp: 0.1,         // interpolation: lower = smoother/floatier
      smoothWheel: true,
    });
    window.__lenis = lenis; // exposed so the burger menu can pause/resume scroll

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000); // GSAP ticker is in seconds, Lenis wants ms
    });
    gsap.ticker.lagSmoothing(0);

    /* --- About: line draw + photo parallax (desktop/tablet only) ----------
       Below 769px the section is a stacked layout (line hidden, photos in a
       grid), so these scroll effects are scoped with matchMedia and cleaned
       up automatically on resize. */
    gsap.matchMedia().add("(min-width: 769px)", function () {
      if (!document.querySelector(".about__line")) return;

      // Centre line draws down with the scroll; the tip follows (scrub),
      // so scrolling back retracts it.
      gsap.fromTo(
        ".about__line",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".about",
            start: "top 55%", // constant draw speed (range == line height): the
            end: "bottom 55%", // tip parks at a fixed screen point, no acceleration
            scrub: true, // tight follow (Lenis already smooths); distance gives the calm feel
          },
        }
      );

      // Photos: light parallax (fromTo +v -> -v so mid-block matches the
      // mockup, with drift around). Each photo is triggered by its own block.
      [
        [".about__photo--1", 14],
        [".about__photo--2", 22],
        [".about__photo--3", -17],
        [".about__photo--4", 11],
        [".about__photo--5", 15],
        [".about__photo--6", -20],
        [".about__photo--7", 12],
      ].forEach(function (item) {
        var el = document.querySelector(item[0]);
        if (!el) return;
        gsap.fromTo(
          el,
          { yPercent: item[1] },
          {
            yPercent: -item[1],
            ease: "none",
            scrollTrigger: {
              trigger: el.closest(".about__block"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    });

    /* --- Points: lines branch out of the white spine on scroll ------------
       White spine draws first, then the purple/green branches emerge from it
       and reach the cards, then stay (scrubbed; desktop/tablet only). */
    gsap.matchMedia().add("(min-width: 769px)", function () {
      var pLines = gsap.utils.toArray(".points__line");
      if (!pLines.length) return;

      pLines.forEach(function (path) {
        var length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".points",
            start: "top 55%", // continue seamlessly from the About spine
            end: "center 40%", // finish while the section is centred & readable
            scrub: true,
          },
        })
        // white spine continues down at the SAME calm pace as the About spine
        // (long duration => no speed jump => no acceleration at the bottom)
        .to(
          ".points__line--white",
          { strokeDashoffset: 0, ease: "none", duration: 0.55 },
          0
        )
        // ...and before it reaches its card, purple & green emerge from it
        .to(
          [".points__line--purple", ".points__line--green"],
          { strokeDashoffset: 0, ease: "none", duration: 0.6 },
          0.4
        );

      // Cards drive up from off-screen, one by one, tied to scroll so they
      // also retreat on the way back up. A long trigger range (top 80% ->
      // centre 40%) keeps it smooth and lets the branches visibly reach them.
      gsap.from(".points__card", {
        y: function () {
          return window.innerHeight * 0.45;
        },
        ease: "none",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".points",
          start: "top 80%",
          end: "center 40%", // settle in sync with the lines
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });

    /* --- Themes: gentle one-time reveal (no scrub, all viewports) ----------
       Title rises in, then the cards fade up in a soft stagger as the section
       scrolls into view. Light by design — no heavy scroll-driven motion. */
    if (document.querySelector(".themes")) {
      gsap.from(".themes__title", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".themes", start: "top 78%" },
      });
      gsap.from(".theme-card", {
        y: 40,
        autoAlpha: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".themes__grid", start: "top 82%" },
      });
    }

    /* --- Program: gentle one-time reveal (title, then rows) --------------- */
    if (document.querySelector(".program")) {
      gsap.from(".program__title", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".program", start: "top 78%" },
      });
      gsap.from(".program__row", {
        y: 32,
        autoAlpha: 0,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".program__table", start: "top 82%" },
      });
    }

    /* --- Partners: gentle title reveal (marquee itself is CSS) ------------ */
    if (document.querySelector(".partners")) {
      gsap.from(".partners__title", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".partners", start: "top 80%" },
      });
    }

    /* --- Place: gentle reveal of the text column and the slider ----------- */
    if (document.querySelector(".place")) {
      gsap.from(".place__text", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".place", start: "top 78%" },
      });
      gsap.from(".place__media", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".place", start: "top 78%" },
      });
    }

    /* --- What is Stepik: each spine segment draws as it scrolls through
       (constant speed, long line => calm path), stats reveal one by one ---- */
    if (document.querySelector(".whatis")) {
      gsap.utils.toArray(".whatis__line").forEach(function (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: line,
              start: "top 95%", // start as soon as the segment peeks in
              end: "bottom 15%", // much longer range => slow, unhurried draw
              scrub: true,
            },
          }
        );
      });
      // stats stay static (no reveal) — a fade was dirtying the line
    }

    /* --- Tariffs: gentle reveal of the text, then the price cards --------- */
    if (document.querySelector(".tariffs")) {
      gsap.from(".tariffs__text", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".tariffs", start: "top 78%" },
      });
      gsap.from(".tariff-card", {
        y: 36,
        autoAlpha: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".tariffs__cards", start: "top 82%" },
      });
    }

    /* --- Finale: gentle reveal of the CTA, then the photo rows ------------ */
    if (document.querySelector(".finale")) {
      gsap.from(".finale__cta", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".finale", start: "top 78%" },
      });
      gsap.from(".finale__row", {
        y: 36,
        autoAlpha: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".finale__photos", start: "top 85%" },
      });
    }

    /* --- FAQ: gentle reveal ---------------------------------------------- */
    if (document.querySelector(".faq")) {
      gsap.from(".faq__title", {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ".faq", start: "top 80%" },
      });
      gsap.from(".faq__item", {
        y: 24,
        autoAlpha: 0,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".faq__list", start: "top 85%" },
      });
    }
  }

  /* --- Lines: prepare the "drawing" effect --------------------------------
     Dash each line by its own length and hide it up front (before first
     paint) so the lines don't flash in. */
  var lines = gsap.utils.toArray(".hero__lines path");
  lines.forEach(function (path) {
    var length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  });

  /* --- Intro timeline ----------------------------------------------------- */
  gsap
    .timeline({ defaults: { ease: "expo.out" } })
    // Title: a long, smooth rise + fade-in
    .from(".hero__title", { y: 64, autoAlpha: 0, duration: 1.2 })
    // Subtitle: same move, overlapping the tail of the title
    .from(".hero__subtitle", { y: 40, autoAlpha: 0, duration: 1.0 }, "-=0.85")
    // CTA plates: staggered cascade rising from their base
    .from(
      ".hero__cta .plate",
      {
        y: 56,
        autoAlpha: 0,
        scale: 0.96,
        transformOrigin: "50% 100%",
        duration: 0.9,
        stagger: 0.16,
        ease: "power3.out",
      },
      "-=0.6"
    )
    // Lines: draw on slowly and smoothly, once the text is in
    .to(
      lines,
      {
        strokeDashoffset: 0,
        duration: 1.7,
        ease: "power2.inOut",
        stagger: 0.28,
      },
      "-=0.4"
    );
})();
