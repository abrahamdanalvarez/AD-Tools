// Applies the saved theme before first paint to avoid a light/dark flash.
// Kept as a static file (not inline) so a strict CSP can allow it by origin.
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem("privora-theme");
  } catch (e) {}
  var dark =
    stored === "dark" ||
    (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
