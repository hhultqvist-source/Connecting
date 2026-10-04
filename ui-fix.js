document.addEventListener("DOMContentLoaded", function () {
  var profile = document.getElementById("profileBtn");
  if (profile) {
    profile.style.visibility = "hidden";
    profile.style.pointerEvents = "none";
    profile.setAttribute("aria-hidden", "true");
  }

  var input = document.getElementById("input");
  var field = input && input.closest(".field");
  var composer = input && input.closest(".composer");

  function visualLineCount() {
    if (!input) return 1;

    var cs = getComputedStyle(input);
    var mirror = document.createElement("div");
    mirror.style.position = "fixed";
    mirror.style.left = "-99999px";
    mirror.style.top = "0";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.wordBreak = "break-word";
    mirror.style.width = input.clientWidth + "px";
    mirror.style.fontFamily = cs.fontFamily;
    mirror.style.fontSize = cs.fontSize;
    mirror.style.fontWeight = cs.fontWeight;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.padding = cs.padding;
    mirror.style.border = "0";
    mirror.style.boxSizing = "border-box";
    mirror.textContent = input.value || " ";

    document.body.appendChild(mirror);

    var line = parseFloat(cs.lineHeight) || 22.4;
    var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var contentHeight = Math.max(line, mirror.scrollHeight - pad);
    var lines = Math.max(1, Math.ceil(contentHeight / line));

    mirror.remove();
    return lines;
  }

  function resizeComposer() {
    if (!input || !field) return;

    var cs = getComputedStyle(input);
    var line = parseFloat(cs.lineHeight) || 22.4;
    var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var one = Math.ceil(line + pad);
    var two = Math.ceil(line * 2 + pad + 2);
    var three = Math.ceil(line * 3 + pad + 2);
    var lines = visualLineCount();
    var expanded = lines >= 3;

    field.classList.toggle("input-expanded", expanded);
    if (composer) composer.classList.toggle("composer-expanded", expanded);
    document.body.classList.toggle("composer-expanded-active", expanded);

    if (expanded) {
      input.style.height = "100%";
      input.style.minHeight = "0";
      input.style.maxHeight = "none";
      input.style.overflowY = "auto";
    } else {
      input.style.minHeight = "";
      input.style.maxHeight = "";
      input.style.height = "auto";
      var wanted = input.scrollHeight;
      input.style.height = Math.max(one, Math.min(wanted, two)) + "px";
      input.style.overflowY = "hidden";
    }
  }

  function scheduleResize() {
    requestAnimationFrame(resizeComposer);
    setTimeout(resizeComposer, 0);
  }

  if (input) {
    input.addEventListener("input", scheduleResize);
    input.addEventListener("beforeinput", function () { setTimeout(resizeComposer, 0); });
    input.addEventListener("focus", scheduleResize);
    window.addEventListener("resize", scheduleResize, { passive: true });
    scheduleResize();
  }

  var style = document.createElement("style");
  style.textContent =
    "#chatView{position:relative!important}" +
    ".composer.composer-expanded{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:20!important;padding:8px!important;background:rgba(15,20,51,.97)!important}" +
    ".composer.composer-expanded .field{display:grid!important;grid-template-columns:44px 44px 1fr 44px 44px!important;grid-template-rows:minmax(0,1fr) 44px!important;gap:6px!important;height:min(390px,48dvh)!important;padding:10px!important;align-items:end!important;border-radius:18px!important}" +
    ".composer.composer-expanded #input{grid-column:1/-1!important;grid-row:1!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;padding:4px 6px!important;margin:0!important;text-align:left!important;align-self:stretch!important;overflow-y:auto!important}" +
    ".composer.composer-expanded #imgBtn{grid-column:1!important;grid-row:2!important}" +
    ".composer.composer-expanded #micBtn{grid-column:2!important;grid-row:2!important}" +
    ".composer.composer-expanded #aiBtn{grid-column:4!important;grid-row:2!important}" +
    ".composer.composer-expanded #sendBtn{grid-column:5!important;grid-row:2!important}" +
    ".composer-expanded-active #empty{display:none!important}";
  document.head.appendChild(style);
});