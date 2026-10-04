document.addEventListener("DOMContentLoaded", function () {
  var profile = document.getElementById("profileBtn");
  if (profile) {
    profile.style.display = "none";
    profile.setAttribute("aria-hidden", "true");
  }
});
