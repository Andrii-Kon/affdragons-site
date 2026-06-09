// Mobile header menu toggle for the rebuilt static header.
(function () {
  function initHeader(header) {
    const toggle = header.querySelector(".affd-header__toggle");
    const panel = header.querySelector(".affd-header__panel");
    if (!toggle || !panel) return;

    function setOpen(open) {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(!header.classList.contains("is-open"));
    });

    document.addEventListener("click", (event) => {
      if (header.classList.contains("is-open") && !header.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  function init() {
    document.querySelectorAll(".affd-header").forEach(initHeader);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
