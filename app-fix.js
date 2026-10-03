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

  // Mobile touch behavior: controls must never invoke iOS text lookup/copy,
  // while actual message text remains selectable.
  var touchStyle = document.createElement("style");
  touchStyle.textContent =
    "#micBtn,#imgBtn,#aiBtn,#sendBtn,.navbtn,.iconbtn,.trans-swap,.paneactions button{" +
    "-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}" +
    ".msg .tr,.msg .orig,.transresult,#trInput,#input{" +
    "-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}";
  document.head.appendChild(touchStyle);

  ["micBtn","imgBtn","aiBtn","sendBtn"].forEach(function (id) {
    var control = document.getElementById(id);
    if (!control) return;
    control.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    control.addEventListener("selectstart", function (event) { event.preventDefault(); });
  });

  // Add Italian everywhere language choices are exposed.
  try {
    if (typeof L !== "undefined" && !L.Italian) {
      L.Italian = { name:"Italian", code:"it-IT", sv:"italian" };
    }
    if (typeof FLAG !== "undefined") FLAG.Italian = "🇮🇹";
    if (typeof LANGS !== "undefined" && !LANGS.some(function (x) { return x[0] === "Italian"; })) {
      LANGS.push(["Italian","Italienska","it-IT","italienska"]);
    }
    if (typeof ROLE !== "undefined" && ROLE.id === "B") {
      if (!ROLE.writeOptions.includes("Italian")) ROLE.writeOptions.push("Italian");
      if (!ROLE.readOptions.includes("Italian")) ROLE.readOptions.push("Italian");
    }

    ["profileThemWrite","profileThem"].forEach(function (id) {
      var select = document.getElementById(id);
      if (select && !Array.from(select.options).some(function (o) { return o.value === "Italian"; })) {
        select.add(new Option("🇮🇹 Italian", "Italian"));
      }
    });

    ["trFrom","trTo"].forEach(function (id) {
      var select = document.getElementById(id);
      if (select && !Array.from(select.options).some(function (o) { return o.value === "Italian"; })) {
        select.add(new Option("🇮🇹 Italian", "Italian"));
      }
    });
  } catch (error) {
    console.warn("Italian language option could not be added", error);
  }

  // Never ask the phone user for provider credentials.
  if (typeof window.callClaude === "function") {
    window.callClaude = async function () {
      throw new Error("Translation service is not connected yet.");
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