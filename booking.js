// De-Vef Beauty · booking form (PREVIEW: data from demo-store.js, kept in this browser only)
import { DURATION, todayISO, lastDay, isOpenDay, dayLabel, hourLabel, startTimes, book, FullError } from "./demo-store.js";

const $ = (id) => document.getElementById(id);
const form = $("bookForm"), service = $("service"), date = $("date"), slots = $("slots"), hint = $("slotHint");
const nameIn = $("name"), phone = $("phone"), notes = $("notes"), err = $("err");
const booked = $("booked");

date.min = todayISO();
date.max = lastDay();

const hrs = (n) => (n === 1 ? "about 1 hour" : `about ${n} hours`);

function render() {
  const svc = service.value, day = date.value;
  const picked = form.querySelector("input[name=start]:checked")?.value;
  slots.innerHTML = "";
  if (!svc || !day) { hint.textContent = "Choose a service and a day to see free times."; return; }
  if (!isOpenDay(day)) { hint.textContent = "We're closed on Sundays. Please pick another day."; return; }
  const times = startTimes(day, svc);
  const open = times.filter((t) => t.free && !t.tooSoon);
  hint.textContent = !open.length
    ? "No free times left that day. Please try another day."
    : `${svc} takes ${hrs(DURATION[svc])}. These times have a stylist free for the whole appointment.`;
  slots.innerHTML = times.map(({ hour, free, tooSoon }) => {
    const off = !free || tooSoon;
    const note = tooSoon ? "Too soon" : !free ? "Full" : free === 1 ? "1 left" : `${free} free`;
    return `<label class="slot${off ? " is-off" : ""}${free === 1 && !off ? " is-last" : ""}">
      <input type="radio" name="start" value="${hour}"${off ? " disabled" : ""}${String(hour) === picked && !off ? " checked" : ""} />
      <span>${hourLabel(hour)}<small>${note}</small></span></label>`;
  }).join("");
}

service.addEventListener("change", render);
date.addEventListener("change", () => { date.classList.remove("invalid"); render(); });
slots.addEventListener("change", () => { $("timeField").classList.remove("invalid"); err.textContent = ""; });
[nameIn, phone].forEach((el) => el.addEventListener("input", () => el.classList.remove("invalid")));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  err.textContent = "";
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  const start = form.querySelector("input[name=start]:checked");
  const bad = [];
  if (!service.value) bad.push(service);
  if (!date.value) bad.push(date);
  if (!nameIn.value.trim()) bad.push(nameIn);
  if (phone.value.replace(/\D/g, "").length < 9) bad.push(phone);
  if (bad.length) {
    bad.forEach((el) => el.classList.add("invalid"));
    bad[0].focus();
    err.textContent = bad.includes(phone) && bad.length === 1 ? "Please check your phone number." : "Please fill in the highlighted fields.";
    return;
  }
  if (!start) {
    $("timeField").classList.add("invalid");
    err.textContent = "Please pick a start time.";
    (slots.querySelector("input:not(:disabled)") || date).focus();
    return;
  }
  const hair = $("hairField").classList.contains("is-open") ? form.hair.value : "";
  try {
    const b = book({ date: date.value, start: Number(start.value), service: service.value, name: nameIn.value.trim(), phone: phone.value.trim(), notes: notes.value.trim(), hair });
    $("bookedWhat").innerHTML = "";
    $("bookedWhat").append(
      document.createTextNode(`${b.service}, ${dayLabel(b.date)}`), document.createElement("br"),
      document.createTextNode(`${hourLabel(b.start)} – ${hourLabel(b.start + b.dur)}`)
    );
    form.hidden = true;
    booked.hidden = false;
    booked.focus({ preventScroll: true });
    booked.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  } catch (x) {
    if (!(x instanceof FullError)) throw x;
    err.textContent = "Sorry, that time has just filled up. Please pick another.";
    render();
  }
});

$("bookAgain").addEventListener("click", () => {
  form.reset();
  service.dispatchEvent(new Event("change"));
  booked.hidden = true;
  form.hidden = false;
  service.focus();
});

render();
