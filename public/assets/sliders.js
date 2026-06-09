// Standalone carousel that reuses the original slick.js DOM contract so the
// CAPTURED slick CSS styles it correctly (no jQuery, no slick lib).
// Wraps slides in slick-list > slick-track, drives the track with a CSS
// transform, and auto-advances like the original.
//
// Two modes:
//  - paged (testimonials/events): steps through a fixed list, dots optional.
//  - loop (partners): TRUE infinite loop — after each step the first slide is
//    recycled to the end of the track, so the visible window is ALWAYS full
//    (it never runs out of cards or shows a partial/empty set at the "end").
(function () {
  function build(container, maxPerView, opts) {
    opts = opts || {};
    const showArrows = opts.arrows === true;
    const showDots = opts.dots !== false;
    const loop = opts.loop === true;
    const interval = opts.interval || 4000;

    let slides = Array.from(container.children).filter((c) => c.nodeType === 1);
    if (slides.length < 1) return;

    function perView() {
      const w = container.clientWidth || container.offsetWidth || 1200;
      if (w >= 1024) return Math.min(maxPerView, slides.length);
      if (w >= 600) return Math.min(2, slides.length);
      return 1;
    }

    // slick-compatible structure: container > slick-list > slick-track > slides
    const list = document.createElement("div");
    list.className = "slick-list draggable";
    const track = document.createElement("div");
    track.className = "slick-track";
    list.appendChild(track);
    slides.forEach((s) => {
      s.classList.add("slick-slide");
      track.appendChild(s);
    });
    container.appendChild(list);
    container.classList.add("slick-slider", "slick-initialized");
    container.style.position = "relative";

    let pv = perView();
    const dots = [];
    let index = 0; // paged mode only

    // ---- layout: size the track so `pv` slides fill the visible width ----
    function sizeSlides() {
      pv = perView();
      const all = Array.from(track.children);
      const n = all.length;
      const slideW = 100 / n;
      track.style.display = "flex";
      track.style.width = `${(n / pv) * 100}%`;
      all.forEach((s) => {
        s.style.width = `${slideW}%`;
        s.style.flex = `0 0 ${slideW}%`;
        s.style.boxSizing = "border-box";
      });
    }

    const maxIndex = () => Math.max(0, slides.length - pv);

    // ---- paged mode rendering ----
    function goPaged(i, instant) {
      index = Math.max(0, Math.min(i, maxIndex()));
      const n = track.children.length;
      track.style.transition = instant ? "none" : "transform .5s ease";
      track.style.transform = `translateX(-${(index / n) * 100}%)`;
      Array.from(track.children).forEach((s, si) => {
        const active = si >= index && si < index + pv;
        s.classList.toggle("slick-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach((d, di) => d.classList.toggle("is-active", di === index));
    }

    // ---- loop mode: advance one card, then recycle first slide to the end ----
    let animating = false;
    const STEP_MS = 500;
    function stepLoop() {
      if (animating) return;
      animating = true;
      const n = track.children.length;
      const stepPct = 100 / n; // width of one slide within the track
      track.style.transition = `transform ${STEP_MS}ms ease`;
      track.style.transform = `translateX(-${stepPct}%)`;
      // Deterministic completion via timer (NOT transitionend, which can be
      // missed when the tab blurs or the pointer enters mid-animation, leaving
      // the slider stuck or stuttering). Always fires, so it never freezes.
      setTimeout(() => {
        // Move the first slide to the end and snap the track back with no anim.
        track.style.transition = "none";
        track.appendChild(track.firstElementChild);
        track.style.transform = "translateX(0)";
        void track.offsetWidth; // force reflow so the next step animates from 0
        markActive();
        animating = false;
      }, STEP_MS + 20);
    }
    function markActive() {
      Array.from(track.children).forEach((s, si) => {
        const active = si < pv;
        s.classList.toggle("slick-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
      });
    }

    // ---- controls ----
    if (showArrows) {
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "ad-slider__arrow ad-slider__arrow--prev";
      prev.setAttribute("aria-label", "Previous");
      prev.innerHTML = "&#8249;";
      const next = document.createElement("button");
      next.type = "button";
      next.className = "ad-slider__arrow ad-slider__arrow--next";
      next.setAttribute("aria-label", "Next");
      next.innerHTML = "&#8250;";
      container.appendChild(prev);
      container.appendChild(next);
      prev.addEventListener("click", () => goPaged(index - 1));
      next.addEventListener("click", () => goPaged(index + 1));
    }
    let dotsWrap = null;
    if (showDots) {
      dotsWrap = document.createElement("div");
      dotsWrap.className = "ad-slider__dots";
      container.appendChild(dotsWrap);
    }
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      dots.length = 0;
      // One dot per scroll window (so 14 events at 3-per-view => 12 dots).
      for (let i = 0; i <= maxIndex(); i++) {
        const d = document.createElement("button");
        d.type = "button";
        d.className = "ad-slider__dot";
        d.addEventListener("click", () => goPaged(i));
        dotsWrap.appendChild(d);
        dots.push(d);
      }
    }

    // ---- init ----
    sizeSlides();
    if (loop) {
      track.style.transform = "translateX(0)";
      markActive();
    } else {
      buildDots();
      goPaged(0, true);
    }

    let timer = setInterval(tick, interval);
    function tick() {
      if (loop) stepLoop();
      else goPaged(index >= maxIndex() ? 0 : index + 1);
    }
    // The looping partners strip runs continuously (no hover pause, matching the
    // original). Paged sliders pause on hover so users can read a card.
    if (!loop) {
      container.addEventListener("mouseenter", () => clearInterval(timer));
      container.addEventListener("mouseleave", () => (timer = setInterval(tick, interval)));
    }

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        sizeSlides();
        if (loop) {
          track.style.transition = "none";
          track.style.transform = "translateX(0)";
          markActive();
        } else {
          buildDots();
          goPaged(Math.min(index, maxIndex()), true);
        }
      }, 150);
    });
  }

  function init() {
    // Slider roles on the homepage, in document order (matching the original):
    //   0 = testimonials ("People Say About Us") — 2 cards, dots only, no arrows
    //   1 = events — 3 cards, dots only, no arrows
    //   2 = partners ("Our Partners") — true infinite loop, no arrows, no dots
    const sliders = document.querySelectorAll(".jet-testimonials__instance");
    sliders.forEach((container, i) => {
      const isPartners = i === 2;
      build(container, i === 0 ? 2 : 3, {
        arrows: false,
        dots: !isPartners,
        loop: isPartners,
        interval: isPartners ? 2000 : 4000,
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
