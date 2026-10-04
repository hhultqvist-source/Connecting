document.addEventListener("DOMContentLoaded", function () {
  var camera = document.getElementById("imgBtn");
  var filePicker = document.getElementById("fileInput");
  var sheet = document.getElementById("sheet");

  if (camera && filePicker) {
    camera.setAttribute("aria-label", "Add photo, video or file");
    camera.removeAttribute("aria-haspopup");
    camera.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (sheet) sheet.hidden = true;
      filePicker.click();
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

  // Place Online at far left of the Connecting header on the same row.
  var headerTop = document.querySelector(".connect-top");
  var contactRow = document.querySelector(".connect-contact");
  var contactLabel = document.getElementById("contactLabel");
  var contactDot = document.getElementById("contactDot");
  var contactStatus = document.getElementById("contactStatus");

  if (headerTop && contactDot && contactStatus) {
    var onlineWrap = document.createElement("div");
    onlineWrap.id = "onlineInline";
    onlineWrap.setAttribute("aria-label", "Presence status");
    onlineWrap.appendChild(contactDot);
    onlineWrap.appendChild(contactStatus);
    headerTop.insertBefore(onlineWrap, headerTop.firstChild);
  }
  if (contactLabel) contactLabel.remove();
  if (contactRow) contactRow.style.display = "none";

  var presenceStyle = document.createElement("style");
  presenceStyle.textContent =
    "header.connect-header{padding:6px 14px!important}" +
    ".connect-top{position:relative!important;display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:42px!important;gap:0!important}" +
    "#onlineInline{display:flex!important;align-items:center!important;gap:7px!important;font-size:12.5px!important;color:var(--mute)!important;white-space:nowrap!important;margin:0!important;z-index:2}" +
    "#onlineInline .live{width:7px!important;height:7px!important;border-radius:50%!important;background:var(--ok)!important;box-shadow:0 0 0 4px rgba(121,230,177,.08)!important}" +
    ".connect-mark{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;text-align:center!important;margin:0!important;z-index:1}" +
    ".connect-emoji{font-size:16px!important;line-height:1!important}" +
    ".connect-word{display:none!important}" +
    "#settingsBtn{margin:0!important;z-index:2!important;flex:0 0 40px!important}" +
    ".connect-contact{display:none!important}";
  document.head.appendChild(presenceStyle);

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