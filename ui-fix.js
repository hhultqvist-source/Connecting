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

  function resizeComposer() {
    if (!input || !field) return;
    var cs = getComputedStyle(input);
    var line = parseFloat(cs.lineHeight) || 22.4;
    var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var one = Math.ceil(line + pad);
    var two = Math.ceil(line * 2 + pad + 2);
    var three = Math.ceil(line * 3 + pad + 2);

    input.style.height = "auto";
    var wanted = input.scrollHeight;
    var expanded = wanted > two + 1;

    field.classList.toggle("input-expanded", expanded);
    if (composer) composer.classList.toggle("composer-expanded", expanded);

    if (expanded) {
      var large = Math.max(three, Math.min(310, Math.round(window.innerHeight * 0.36)));
      input.style.height = large + "px";
      input.style.maxHeight = large + "px";
      input.style.overflowY = wanted > large ? "auto" : "hidden";
    } else {
      input.style.maxHeight = "";
      input.style.height = Math.max(one, Math.min(wanted, two)) + "px";
      input.style.overflowY = "hidden";
    }
  }

  if (input) {
    input.addEventListener("input", function () { requestAnimationFrame(resizeComposer); });
    input.addEventListener("focus", function () { requestAnimationFrame(resizeComposer); });
    window.addEventListener("resize", function () { requestAnimationFrame(resizeComposer); }, { passive: true });
    resizeComposer();
  }
});