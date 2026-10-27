export function setDarkMode(isDarkMode) {
  localStorage.setItem("home-affairs-theme", isDarkMode ? "dark" : "light");
  if (isDarkMode) {
    document.body.dataset.theme = "dark";
  } else {
    delete document.body.dataset.theme;
  }
  window.dispatchEvent(new CustomEvent("home-affairs-theme-change", {
    detail: { isDarkMode }
  }));
}
