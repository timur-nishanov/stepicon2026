// Stepicon 2026 — hero intro animation.
// Plays once on first page load. Background, lines, stars and header appear
// immediately; only the title, subtitle and CTA plates animate in.
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
    );
})();
