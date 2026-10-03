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

    if (expanded) {
      var large = Math.max(three, Math.min(330, Math.round(window.innerHeight * 0.38)));
      input.style.height = large + "px";
      input.style.minHeight = large + "px";
      input.style.maxHeight = large + "px";
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
    ".composer.composer-expanded{padding-top:8px}" +
    ".composer.composer-expanded .field{align-items:flex-end;padding-left:8px!important}" +
    ".composer.composer-expanded #input{min-height:min(330px,38dvh)!important;max-height:min(330px,38dvh)!important;padding-left:0!important;margin-left:0!important;text-align:left!important}";
  document.head.appendChild(style);
});