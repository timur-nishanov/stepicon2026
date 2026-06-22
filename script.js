// Stepicon 2026 — hero intro animation.
// Plays once on first page load. Background, stars and header appear
// immediately; the title, subtitle and CTA plates fade/rise in, then the
// SVG lines draw themselves on along their paths.
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

  // Prepare the "drawing" effect: dash each line by its own length and hide it
  // (do this up front, before first paint, so the lines don't flash in).
  var lines = gsap.utils.toArray(".hero__lines path");
  lines.forEach(function (path) {
    var length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  });

  gsap
    .timeline({ defaults: { ease: "power2.out" } })
    // Title: short rise + fade-in
    .from(".hero__title", { y: 30, autoAlpha: 0, duration: 0.7 })
    // Subtitle: same move, slightly after the title
    .from(".hero__subtitle", { y: 24, autoAlpha: 0, duration: 0.6 }, "-=0.35")
    // CTA plates: gentle staggered cascade
    .from(
      ".hero__cta .plate",
      { y: 24, autoAlpha: 0, duration: 0.5, stagger: 0.12 },
      "-=0.2"
    )
    // Lines: draw on along their paths, once the text is in
    .to(
      lines,
      {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: "power2.inOut",
        stagger: 0.2,
      },
      "-=0.2"
    );
})();
