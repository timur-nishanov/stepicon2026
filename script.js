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
     The layer is oversized, so this drift never reveals an edge. A scroll
     parallax can be added later on the same .stars__layer using `y` (px);
     it will compose with the xPercent/yPercent/scale used here, and the
     fixed, overflow-hidden .stars wrapper keeps it on screen at all times. */
  gsap.to(".stars__layer", {
    xPercent: 2,
    yPercent: -3,
    scale: 1.05,
    duration: 18,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });

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
