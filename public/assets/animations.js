// Reproduces Elementor's entrance animations statically. Elements carry
// data-anim (fadeInLeft / fadeInRight / ...) and data-anim-delay (ms). They
// start hidden via .elementor-invisible; when scrolled into view we add the
// animation class + .ad-animate to play it once, matching the original timing.
(function () {
  function play(el) {
    const name = el.getAttribute("data-anim");
    const delay = parseInt(el.getAttribute("data-anim-delay") || "0", 10);
    if (!name) return;
    setTimeout(() => {
      el.classList.add(name, "ad-animate");
    }, delay);
  }

  function init() {
    const targets = document.querySelectorAll("[data-anim]");
    if (!("IntersectionObserver" in window)) {
      // No observer support: just reveal everything.
      targets.forEach((el) => el.classList.add(el.getAttribute("data-anim"), "ad-animate"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            play(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => io.observe(el));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
