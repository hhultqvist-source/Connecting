document.addEventListener("DOMContentLoaded", function () {
  var camera = document.getElementById("imgBtn");
  var capture = document.getElementById("captureInput");
  var sheet = document.getElementById("sheet");

  if (camera && capture) {
    camera.setAttribute("aria-label", "Open camera");
    camera.removeAttribute("aria-haspopup");
    camera.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (sheet) sheet.hidden = true;
      capture.click();
    };
  }

  var settings = document.getElementById("settings");
  var settingsBtn = document.getElementById("settingsBtn");

  if (settings) {
    var intro = settings.querySelector(":scope > p");
    if (intro) intro.textContent = "Chat and language preferences.";

    ["kClaude", "kGroq", "kEleven", "kVoice"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var labels = Array.from(settings.querySelectorAll("label"));
      labels.forEach(function (label) {
        if (label.nextElementSibling === input) label.hidden = true;
      });
      input.hidden = true;
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", function (event) {
      if (!event.isTrusted) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
});