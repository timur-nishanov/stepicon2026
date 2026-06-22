// Stepicon 2026 — hero intro animation.
// Plays once on first page load. Background and header appear immediately;
// the title, subtitle and CTA plates reveal in, then the SVG lines draw on,
// and the star field gets a gentle, continuous idle drift.
// (This script lives at the end of <body>, so the DOM is already parsed.)

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

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000); // GSAP ticker is in seconds, Lenis wants ms
    });
    gsap.ticker.lagSmoothing(0);

    /* --- Stars: light scroll parallax ------------------------------------- */
    gsap.to(".stars__layer", {
      y: function () {
        return -window.innerHeight * 0.08; // light drift over the full scroll
      },
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: "max",
        scrub: true, // tracks the already-smoothed Lenis scroll (no double lag)
        invalidateOnRefresh: true,
      },
    });

    /* --- About (block 2): centre line draws down with the scroll ----------
       The tip follows the scroll (scrub), so scrolling back retracts it. */
    if (document.querySelector(".about__line")) {
      gsap.fromTo(
        ".about__line",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".about",
            start: "top bottom", // begin as the section appears (no entry gap)
            end: "bottom 80%",
            scrub: true,
          },
        }
      );

      /* --- About photos: light parallax (centred on the design position) ---
         fromTo +v -> -v so mid-section matches the mockup, with drift around. */
      [
        [".about__photo--1", 8],
        [".about__photo--2", 14],
        [".about__photo--3", -10],
        [".about__photo--4", 6],
      ].forEach(function (item) {
        gsap.fromTo(
          item[0],
          { yPercent: item[1] },
          {
            yPercent: -item[1],
            ease: "none",
            scrollTrigger: {
              trigger: ".about",
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
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
