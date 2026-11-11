// De-Vef Beauty · North Legon
// Services that use braiding hair (shows the "bring your own / provide it" question)
const BRAID_SERVICES = ["Cornrows", "Knotless braids", "Curly braids"];

// Photos fade in once downloaded (no pop-in on slow mobile data). Already-cached ones show at once.
document.querySelectorAll(".fade-img").forEach((img) => {
  const show = () => img.classList.add("loaded");
  if (img.complete) {
    img.style.transition = "none";
    show();
    requestAnimationFrame(() => requestAnimationFrame(() => (img.style.transition = "")));
  } else {
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", show, { once: true });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  /* ---------- Header + mobile menu ---------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Reveal (services menu + gallery only) ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Booking form: hair question + service pre-fill ---------- */
  const form = document.getElementById("bookForm");
  const service = document.getElementById("service");
  const hairField = document.getElementById("hairField");

  function toggleHair() {
    const show = BRAID_SERVICES.includes(service.value);
    hairField.classList.toggle("is-open", show);
    hairField.inert = !show;
    hairField.setAttribute("aria-hidden", String(!show));
  }
  service.addEventListener("change", () => { service.classList.remove("invalid"); toggleHair(); });

  // Service rows pre-fill the form; the filled field glows once when the form comes into view
  let glowPending = false;
  const glow = () => {
    glowPending = false;
    service.classList.remove("prefilled");
    void service.offsetWidth; // restart the animation if it ran before
    service.classList.add("prefilled");
  };
  const formInView = () => { const r = form.getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.3; };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { if (en.isIntersecting && glowPending) glow(); }, { threshold: 0.4 }).observe(form);
  }
  document.querySelectorAll("[data-service]").forEach((a) =>
    a.addEventListener("click", () => {
      service.value = a.dataset.service;
      service.dispatchEvent(new Event("change")); // updates the hair question and the free times
      if (formInView()) glow(); else glowPending = true;
    })
  );

  // Free times, validation and booking: booking.js (preview mode, see demo-store.js)

  document.getElementById("year").textContent = new Date().getFullYear();
});
