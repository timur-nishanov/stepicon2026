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

/* --- Program day switcher (visual toggle only; data swaps later) --------- */
(function () {
  var sw = document.querySelector(".switcher");
  if (!sw) return;
  var btns = sw.querySelectorAll(".switcher__btn");
  btns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      btns.forEach(function (b) {
        b.classList.remove("switcher__btn--active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("switcher__btn--active");
      btn.setAttribute("aria-selected", "true");
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

  /* --- Stars: gentle, never-ending idle drift -----------------------------
     The layer is oversized, so this drift never reveals an edge. This uses
     xPercent/yPercent/scale; the scroll parallax below uses `y` (px) on the
     same element, so the two compose without fighting. The fixed,
     overflow-hidden .stars wrapper keeps the field on screen at all times. */
  gsap.to(".stars__layer", {
    xPercent: 2,
    yPercent: -3,
    scale: 1.05,
    duration: 18,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });

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

    /* --- Stars: light scroll parallax ------------------------------------- */
    gsap.to(".stars__layer", {
      y: function () {
        return -window.innerHeight * 0.14; // parallax drift over the full scroll
      },
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: "max",
        scrub: true, // tracks the already-smoothed Lenis scroll (no double lag)
        invalidateOnRefresh: true,
      },
    });

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
        // white spine continues down...
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

      // Cards drive up from off-screen, one by one (no fade; gentle slide)
      gsap.from(".points__card", {
        y: function () {
          return window.innerHeight * 0.55;
        },
        ease: "none",
        stagger: 0.16,
        scrollTrigger: {
          trigger: ".points",
          start: "top 55%", // arrive together with the spine (not before it)
          end: "center 40%", // settle while centred, same as the lines
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
