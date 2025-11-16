window.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle-menu");
  if (toggle) toggle.checked = false;

  // Collapse the navbar when any link is clicked
  const navLinks = document.querySelectorAll(".nav-links a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (toggle) toggle.checked = false;
    });
  });
});
