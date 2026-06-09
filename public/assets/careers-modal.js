// Builds and wires the Careers "Respond" modal (clean replacement for the
// original Elementor popup, which rendered misaligned). Same fields as the
// original; submission is stubbed until the real backend is connected.
(function () {
  const VACANCIES = [
    "Senior affiliate manager",
    "Sales manager",
    "Fullstack Middle Developer (PHP/JavaScript/CSS)",
    "Senior PHP Developer Yii2",
    "SMM manager",
  ];

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.className = "ad-modal-overlay";
    overlay.innerHTML =
      '<div class="ad-modal" role="dialog" aria-modal="true" aria-label="Respond to vacancy">' +
      '<button class="ad-modal__close" aria-label="Close">&times;</button>' +
      '<form class="ad-modal__form">' +
      '<div class="ad-modal__field"><label>Name</label><input type="text" name="name" placeholder="Name"></div>' +
      '<div class="ad-modal__field"><label>Email</label><input type="email" name="email" placeholder="Email"></div>' +
      '<div class="ad-modal__field"><label>Vacancy</label><select name="vacancy">' +
      VACANCIES.map((v) => `<option>${v}</option>`).join("") +
      "</select></div>" +
      '<div class="ad-modal__field"><label>Message</label><textarea name="message" placeholder="Message"></textarea></div>' +
      '<div class="ad-modal__field"><label>Upload resume (pdf)</label><input type="file" name="resume" accept="application/pdf"></div>' +
      '<button type="submit" class="ad-modal__send">SEND</button>' +
      "</form></div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {
    // The Respond button on the careers page (Elementor button widget).
    const trigger = [...document.querySelectorAll("a, button")].find(
      (el) => el.textContent.trim() === "Respond"
    );
    if (!trigger) return;

    const overlay = buildModal();
    const close = overlay.querySelector(".ad-modal__close");
    const vacancySelect = overlay.querySelector('select[name="vacancy"]');

    function open(preselect) {
      if (preselect && vacancySelect) {
        const opt = [...vacancySelect.options].find((o) => o.textContent.trim() === preselect.trim());
        if (opt) vacancySelect.value = opt.value;
      }
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function hide() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    });
    close.addEventListener("click", hide);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hide();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
    });

    // Stubbed submit until the real backend is wired (matches our forms policy).
    overlay.querySelector(".ad-modal__form").addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thanks! Your application has been received. (Form backend to be connected.)");
      hide();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
