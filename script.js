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

/* --- Panel speakers: swipeable track with arrows -------------------------
       The track scrolls natively (trackpad, touch), so this only adds the
       two things the browser doesn't give for free: arrow buttons that step
       one speaker at a time, and click-and-drag for mouse users. ---------- */
(function () {
  /* Exposed so the talk pop-up can wire up the slider it builds on the fly,
     rather than keeping a second copy of this logic. */
  window.__initTalkPanel = function (panel, trackSelector) {
    var track = panel.querySelector(trackSelector || ".talk__author--slider");
    if (!track) return;
    var prev = panel.querySelector(".talk__panel-nav--prev");
    var next = panel.querySelector(".talk__panel-nav--next");

    function step() {
      var first = track.children[0];
      if (!first) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    /* A scrollLeft that never quite reaches the end (sub-pixel widths, zoom)
       would leave the arrow enabled forever — hence the 2px slack. */
    function sync() {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
    }

    if (prev) {
      prev.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
    }

    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        sync();
        ticking = false;
      });
    });
    window.addEventListener("resize", sync);

    /* Drag to scroll. Pointer events cover mouse and pen; touch already
       scrolls natively, so it is left alone. */
    var down = false;
    var startX = 0;
    var startLeft = 0;
    var moved = 0;

    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      down = true;
      moved = 0;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > moved) moved = Math.abs(dx);
      track.scrollLeft = startLeft - dx;
      e.preventDefault();
    });

    function endDrag() {
      if (!down) return;
      down = false;
      track.classList.remove("is-dragging");
      sync();
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("pointerleave", endDrag);

    /* Swallow the click that follows a real drag, so releasing over a
       caption doesn't feel like a stray tap. */
    track.addEventListener(
      "click",
      function (e) {
        if (moved > 5) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    sync();
  };

  Array.prototype.forEach.call(document.querySelectorAll(".talk__panel"), function (panel) {
    window.__initTalkPanel(panel);
  });
})();

/* --- Talk pop-up --------------------------------------------------------
   A talk card opts in by carrying a hidden .talk__details block (time +
   abstract). This marks those cards clickable, mirrors the hover onto the
   card (so hovering just the topic moves the card and rounds the portrait),
   and fills the single #talk-modal from whichever card was clicked. ------ */
(function () {
  var modal = document.getElementById("talk-modal");
  if (!modal) return;

  var elTime = modal.querySelector(".talk-modal__time");
  var elTitle = modal.querySelector(".talk-modal__title");
  var elAbstract = modal.querySelector(".talk-modal__abstract");
  var slot = modal.querySelector(".talk-modal__speakers-slot");
  var closeBtn = modal.querySelector(".talk-modal__close");
  var lastFocus = null;

  /* Which input device is in use right now. Capture phase so it is already
     correct by the time any click or keydown handler runs. */
  document.addEventListener("keydown", function () {
    document.documentElement.classList.add("kbd-nav");
  }, true);
  document.addEventListener("pointerdown", function () {
    document.documentElement.classList.remove("kbd-nav");
  }, true);

  var hideTimer = null;

  function setOpen(open) {
    clearTimeout(hideTimer);
    if (open) {
      modal.hidden = false;
      /* Flush layout so the browser sees the off-screen start position before
         the class lands — otherwise it jumps in with no slide. A forced
         reflow rather than requestAnimationFrame: rAF is throttled in a
         background tab, which would leave the panel parked off-screen. */
      void modal.offsetWidth;
      modal.classList.add("is-open");
    } else {
      modal.classList.remove("is-open");
      /* Keep it in the DOM until the slide-out has run, then hide it so it
         stops catching clicks and leaves the tab order. On a timer, not
         transitionend: under prefers-reduced-motion there is no transition
         and so no event, which would strand an invisible scrim over the page. */
      hideTimer = setTimeout(function () { modal.hidden = true; }, 450);
    }
    document.documentElement.classList.toggle("talk-modal-open", open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  }

  /* Focus goes back to the topic that opened the pop-up, so keyboard users
     don't get dropped at the top of the page. Whether that shows a ring is
     decided by html.kbd-nav (see below), not by the browser's :focus-visible
     heuristic — that one lit the ring after a plain mouse click too. */
  function close() {
    if (modal.hidden) return;
    setOpen(false);
    if (lastFocus) lastFocus.focus();
    lastFocus = null;
  }

  /* reserveBox: keep the portrait slot even when there is no portrait yet, so
     the caption stays level with the speakers beside it. Only worth doing when
     there ARE speakers beside it — on a solo card it would just leave a hole. */
  function speakerCard(photoImg, nameEl, reserveBox) {
    var card = document.createElement("div");
    card.className = "talk-modal__speaker";
    if (photoImg || reserveBox) {
      var box = document.createElement("div");
      box.className = "talk-modal__photo";
      if (photoImg) {
        var img = document.createElement("img");
        img.src = photoImg.getAttribute("src");
        img.alt = photoImg.getAttribute("alt") || "";
        box.appendChild(img);
      } else {
        box.className += " talk-modal__photo--empty";
      }
      card.appendChild(box);
    }
    if (nameEl) {
      var cap = document.createElement("div");
      cap.className = "talk-modal__name";
      // the card caption is "Имя Фамилия,<br><span>должность</span>" — reuse it
      // as-is, only restyling the role line inside the pop-up
      cap.innerHTML = nameEl.innerHTML;
      var role = cap.querySelector(".talk__tba-role");
      if (role) {
        role.className = "talk-modal__role";
        /* The pop-up column is much narrower than the card, so a very long
           role can be given a trimmed version just for here via
           data-role-short on the card's role span. */
        var short = role.getAttribute("data-role-short");
        if (short) role.textContent = short;
        role.removeAttribute("data-role-short");
      }
      /* The card writes "Имя Фамилия," because the role follows on the next
         line; stacked in the pop-up that trailing comma reads as a typo. */
      cap.childNodes.forEach(function (node) {
        if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(/,\s*$/, "");
      });
      card.appendChild(cap);
    }
    return card;
  }

  function navButton(dir) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "talk__panel-nav talk__panel-nav--" + dir;
    b.setAttribute("aria-label", dir === "prev" ? "Предыдущие спикеры" : "Следующие спикеры");
    var img = document.createElement("img");
    img.src = "assets/chevron-" + (dir === "prev" ? "left" : "right") + ".svg";
    img.alt = "";
    img.width = 31;
    img.height = 31;
    b.appendChild(img);
    return b;
  }

  function open(talk, trigger) {
    var details = talk.querySelector(".talk__details");
    if (!details) return;
    var time = details.querySelector(".talk__time");
    var abstract = details.querySelector(".talk__abstract");
    var title = talk.querySelector(".talk__title");

    elTime.textContent = time ? time.textContent.trim() : "";
    elTitle.innerHTML = title ? title.innerHTML : "";
    elAbstract.innerHTML = abstract ? abstract.innerHTML : "";

    /* Rebuilt from scratch every time: the arrows and the track carry their
       own listeners, so reusing the nodes would stack a new set on each open. */
    slot.textContent = "";
    var cards = [];
    var pendingSlider = null;
    var groups = talk.querySelectorAll(".talk__speaker");
    if (groups.length) {
      Array.prototype.forEach.call(groups, function (sp) {
        cards.push(speakerCard(sp.querySelector(".talk__portrait"),
                               sp.querySelector(".talk__tba--name"),
                               groups.length > 1));
      });
    } else {
      var author = talk.querySelector(".talk__author");
      if (author) {
        cards.push(speakerCard(author.querySelector(".talk__portrait"),
                               author.querySelector(".talk__tba--name")));
      }
    }

    var track = document.createElement("div");
    track.className = "talk-modal__speakers";
    cards.forEach(function (c) { track.appendChild(c); });

    /* One or two speakers fit side by side. More than that and the columns get
       too narrow for a full job title, so they ride the same slider the
       programme card uses — two in view, arrows and drag included. */
    if (cards.length > 2) {
      track.classList.add("talk-modal__speakers--slider");
      var panel = document.createElement("div");
      panel.className = "talk__panel talk-modal__slider";
      panel.appendChild(navButton("prev"));
      panel.appendChild(track);
      panel.appendChild(navButton("next"));
      slot.appendChild(panel);
      pendingSlider = panel;
    } else {
      track.setAttribute("data-count", String(cards.length));
      slot.appendChild(track);
    }

    // green portrait -> purple strip, and the other way round
    var accent = talk.getAttribute("data-accent");
    if (accent) modal.setAttribute("data-accent", accent);
    else modal.removeAttribute("data-accent");

    /* the title that opened it, not document.activeElement: a mouse click on
       a tabindex element doesn't always leave focus there, and restoring to
       <body> would strand focus inside the hidden panel on close */
    lastFocus = trigger || document.activeElement;
    setOpen(true);
    /* after setOpen: while the panel is still hidden the track measures zero,
       and the arrows would both come up disabled */
    if (pendingSlider && window.__initTalkPanel) {
      window.__initTalkPanel(pendingSlider, ".talk-modal__speakers--slider");
    }
    if (closeBtn) closeBtn.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll(".talk"), function (talk) {
    if (!talk.querySelector(".talk__details")) return;
    var title = talk.querySelector(".talk__title");
    if (!title) return;

    talk.classList.add("talk--clickable");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");

    function hot(on) { talk.classList.toggle("talk--hot", on); }
    title.addEventListener("pointerenter", function () { hot(true); });
    title.addEventListener("pointerleave", function () { hot(false); });
    title.addEventListener("focus", function () { hot(true); });
    title.addEventListener("blur", function () { hot(false); });

    title.addEventListener("click", function () { open(talk, title); });
    title.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        open(talk, title);
      }
    });
  });

  Array.prototype.forEach.call(modal.querySelectorAll("[data-talk-close]"), function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
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
// lines draw on), plus scroll parallax and the scroll-driven section lines.
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
        [".about__photo--8", 16],
        [".about__photo--9", -18],
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
