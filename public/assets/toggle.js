// Reproduces Elementor's toggle/accordion behaviour (no jQuery/Elementor JS).
// Each item: a clickable header (.elementor-tab-title with aria-controls) and a
// body (.elementor-tab-content). Clicking a header opens/closes its body and
// flips aria-expanded + the active classes the captured CSS keys off of.
(function () {
  function init() {
    const titles = document.querySelectorAll(".elementor-tab-title");
    if (!titles.length) return;

    titles.forEach((title) => {
      const id = title.getAttribute("aria-controls");
      const content = id ? document.getElementById(id) : title.nextElementSibling;
      if (!content) return;

      // Start collapsed unless Elementor marked it active (no animation on load).
      const startOpen = title.getAttribute("aria-expanded") === "true" || title.classList.contains("elementor-active");
      setOpen(title, content, startOpen, false);

      const toggle = () => setOpen(title, content, !isOpen(title), true);
      title.addEventListener("click", toggle);
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function isOpen(title) {
    return title.getAttribute("aria-expanded") === "true";
  }

  function setOpen(title, content, open, animate) {
    title.setAttribute("aria-expanded", open ? "true" : "false");
    title.classList.toggle("elementor-active", open);
    content.classList.toggle("elementor-active", open);
    content.setAttribute("aria-hidden", open ? "false" : "true");

    // swap the caret icon (up when open, down when closed) if both exist
    const opened = title.querySelector(".elementor-toggle-icon-opened");
    const closed = title.querySelector(".elementor-toggle-icon-closed");
    if (opened) opened.style.display = open ? "" : "none";
    if (closed) closed.style.display = open ? "none" : "";

    // Smoothly animate the content height (matches the original's slide effect).
    content.style.overflow = "hidden";
    if (!animate) {
      // initial render: set end state with no transition
      content.style.transition = "none";
      content.style.display = open ? "block" : "none";
      content.style.height = open ? "auto" : "0px";
      return;
    }
    content.style.display = "block";
    const full = content.scrollHeight;
    if (open) {
      content.style.transition = "height .35s ease";
      content.style.height = "0px";
      void content.offsetHeight; // reflow
      content.style.height = full + "px";
      const done = () => {
        content.style.height = "auto"; // let it size naturally after opening
        content.removeEventListener("transitionend", done);
      };
      content.addEventListener("transitionend", done);
    } else {
      content.style.transition = "height .35s ease";
      content.style.height = content.scrollHeight + "px";
      void content.offsetHeight; // reflow
      content.style.height = "0px";
      const done = () => {
        content.style.display = "none";
        content.removeEventListener("transitionend", done);
      };
      content.addEventListener("transitionend", done);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
