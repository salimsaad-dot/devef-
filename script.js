// De-Vef Beauty · North Legon
const WHATSAPP_NUMBER = "233546626332"; // international format, no "+" or leading 0
const TIMEZONE = "Africa/Accra";
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

  /* ---------- Booking form → WhatsApp ---------- */
  const form = document.getElementById("bookForm");
  const service = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const nameInput = document.getElementById("name");
  const hairField = document.getElementById("hairField");
  const err = document.getElementById("err");

  // Earliest bookable day = today (Ghana time)
  dateInput.min = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()); // YYYY-MM-DD

  const hairShown = () => hairField.classList.contains("is-open");
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
      service.classList.remove("invalid");
      toggleHair();
      if (formInView()) glow(); else glowPending = true;
    })
  );

  dateInput.addEventListener("change", () => dateInput.classList.remove("invalid"));
  nameInput.addEventListener("input", () => nameInput.classList.remove("invalid"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    err.textContent = "";
    const missing = [service, dateInput, nameInput].filter((el) => !el.value.trim());
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
    if (missing.length) {
      missing.forEach((el) => el.classList.add("invalid"));
      missing[0].focus();
      err.textContent = "Please fill in the highlighted fields.";
      return;
    }

    const niceDate = new Date(dateInput.value + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const notes = document.getElementById("notes").value.trim();

    const lines = [
      "Hello De-Vef! I'd like to book an appointment.",
      "",
      `*Service:* ${service.value}`,
      `*Day:* ${niceDate}`,
      `*Time:* ${form.slot.value} (please confirm the exact time)`,
    ];
    if (hairShown()) lines.push(`*Hair:* ${form.hair.value}`);
    lines.push(`*Name:* ${nameInput.value.trim()}`);
    if (notes) lines.push(`*Notes:* ${notes}`);

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  });

  document.getElementById("year").textContent = new Date().getFullYear();
});
