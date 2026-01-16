function getData(evt, tabName) {
  var i, tabcontent, tablinks;

  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  document.getElementById(tabName).style.display = "block";

  if (evt && evt.currentTarget) {
    evt.currentTarget.className += " active";
  }

  const hiddenTabs = ["matchHistory", "commanders"];

  const overlayMobile = document.getElementById("overlay-text-mobile");
  if (overlayMobile) {
    overlayMobile.style.display = hiddenTabs.includes(tabName) ? "none" : "";
  }

  const smokeCanvas = document.querySelector("canvas");
  if (smokeCanvas) {
    smokeCanvas.style.display = hiddenTabs.includes(tabName) ? "none" : "block";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const firstTab = document.querySelector(".tablinks");
  if (!firstTab) return;

  const tabName = firstTab.getAttribute("onclick").match(/'(.+?)'/)[1];

  getData(null, tabName);

  firstTab.classList.add("active");
});
