// De-Vef Beauty · owner's bookings page (PREVIEW: sample data, this browser only)
import { SAMPLE, todayISO, addDays, lastDay, isOpenDay, dayLabel, hourLabel, bookingsOn, cancel, resetDemo, confirmBooking, confirmText } from "./demo-store.js";

const $ = (id) => document.getElementById(id);
const board = $("board"), detail = $("detail"), dayIn = $("day");
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = (n) => n.trim().split(/\s+/)[0];

// Open on the day of the newest booking made on the site, else today (or the next open day)
const mine = (() => { try { return (JSON.parse(localStorage.getItem("devef-demo-v1"))?.added || []).at(-1); } catch { return null; } })();
let day = todayISO();
while (!isOpenDay(day)) day = addDays(day, 1);
if (mine && mine.date >= todayISO()) day = mine.date;
let selected = mine?.id || null;
let sent = null; // booking whose confirmation message is on show

dayIn.min = todayISO();
dayIn.max = lastDay();

function render() {
  dayIn.value = day;
  $("prev").disabled = day <= todayISO();
  $("next").disabled = day >= lastDay();
  $("dayTitle").textContent = day === todayISO() ? "Today" : day === addDays(todayISO(), 1) ? "Tomorrow" : dayLabel(day, { weekday: "long" });
  const list = bookingsOn(day);
  if (!isOpenDay(day)) {
    $("count").textContent = `${dayLabel(day)} · Closed`;
    board.innerHTML = `<p class="board-empty">Closed on Sundays.</p>`;
    detail.hidden = true;
    return;
  }
  const waiting = list.filter((b) => !b.confirmed).length;
  $("count").textContent = `${dayLabel(day)} · ${list.length} booking${list.length === 1 ? "" : "s"}${waiting ? ` · ${waiting} to confirm` : ""}`;

  const hours = [];
  for (let h = SAMPLE.open; h < SAMPLE.close; h++) hours.push(h);
  const chairs = Array.from({ length: SAMPLE.chairs }, (_, i) => i + 1);
  board.style.setProperty("--rows", hours.length);
  board.innerHTML = `
    <div class="board-head"><span></span>${chairs.map((c) => `<span>Chair ${c}</span>`).join("")}</div>
    <div class="board-body">
      <div class="board-times">${hours.map((h) => `<span>${hourLabel(h)}</span>`).join("")}</div>
      ${chairs.map((c) => `<div class="board-col">${list.filter((b) => b.chair === c).map((b) => `
        <button type="button" class="appt${b.mine ? " is-new" : ""}${b.confirmed ? "" : " is-pending"}${b.id === selected ? " is-sel" : ""}" data-id="${esc(b.id)}"
          style="--start:${b.start - SAMPLE.open};--dur:${b.dur}" aria-label="${esc(`${hourLabel(b.start)} to ${hourLabel(b.start + b.dur)}, ${b.service}, ${b.name}${b.confirmed ? ", confirmed" : ", not confirmed yet"}`)}">
          <span class="appt-time">${hourLabel(b.start)}–${hourLabel(b.start + b.dur)}</span>
          <span class="appt-svc">${esc(b.service)}</span>
          <span class="appt-name">${esc(first(b.name))}</span>
          ${b.mine ? `<span class="appt-new">New</span>` : ""}
        </button>`).join("")}</div>`).join("")}
    </div>`;
  showDetail(list.find((b) => b.id === selected));
}

function showDetail(b) {
  if (!b) { detail.hidden = true; detail.innerHTML = ""; return; }
  detail.innerHTML = `
    <div class="detail-top">
      <div>
        <p class="detail-when">${esc(dayLabel(b.date))} · ${hourLabel(b.start)} – ${hourLabel(b.start + b.dur)} · Chair ${b.chair}</p>
        <h2>${esc(b.service)}</h2>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close details"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <p class="status ${b.confirmed ? "is-ok" : "is-wait"}">${b.confirmed
      ? `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Confirmed. ${esc(first(b.name))} has your WhatsApp message.`
      : `<i class="fa-regular fa-clock" aria-hidden="true"></i> Waiting for you to confirm`}</p>
    <dl>
      <div><dt>Client</dt><dd>${esc(b.name)}</dd></div>
      <div><dt>Phone</dt><dd>${esc(b.phone)}</dd></div>
      ${b.hair ? `<div><dt>Hair</dt><dd>${esc(b.hair)}</dd></div>` : ""}
      ${b.notes ? `<div><dt>Notes</dt><dd>${esc(b.notes)}</dd></div>` : ""}
    </dl>
    <div class="detail-actions">
      ${b.confirmed ? "" : `<button type="button" class="btn btn-sm btn-wa" data-confirm="${esc(b.id)}"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Confirm on WhatsApp</button>`}
      <button type="button" class="btn btn-sm${b.confirmed ? "" : " btn-line"}" data-demo="message"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Message</button>
      <button type="button" class="btn btn-sm btn-line" data-demo="call"><i class="fa-solid fa-phone" aria-hidden="true"></i> Call</button>
      <button type="button" class="btn btn-sm btn-line danger" data-cancel="${esc(b.id)}">Cancel booking</button>
    </div>
    <p class="detail-note" id="detailNote" role="status"></p>
    ${sent === b.id ? `<div class="wa-sent">
      <p class="wa-label">Sent to ${esc(first(b.name))} on WhatsApp (preview: nothing was really sent)</p>
      <p class="wa-bubble">${esc(confirmText(b))}</p>
    </div>` : ""}`;
  detail.hidden = false;
}

board.addEventListener("click", (e) => {
  const a = e.target.closest(".appt");
  if (!a) return;
  selected = a.dataset.id;
  sent = null;
  render();
  detail.focus({ preventScroll: true });
  detail.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

detail.addEventListener("click", (e) => {
  const note = $("detailNote");
  if (e.target.closest("[data-close]")) { selected = null; render(); return; }
  const demo = e.target.closest("[data-demo]");
  if (demo) {
    const b = bookingsOn(day).find((x) => x.id === selected);
    note.textContent = demo.dataset.demo === "message"
      ? `In the real version this opens WhatsApp with ${first(b.name)}, ready to type.`
      : `In the real version this calls ${first(b.name)} straight away.`;
    return;
  }
  const ok = e.target.closest("[data-confirm]");
  if (ok) {
    // Real version: window.open(`https://wa.me/${ghanaNumber(b.phone)}?text=${encodeURIComponent(confirmText(b))}`) then mark confirmed.
    confirmBooking(ok.dataset.confirm);
    sent = ok.dataset.confirm;
    render();
    detail.querySelector(".wa-sent")?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return;
  }
  const c = e.target.closest("[data-cancel]");
  if (c && confirm("Cancel this booking? The time becomes free on the website again.")) {
    cancel(c.dataset.cancel);
    selected = null;
    render();
    $("count").textContent += " · Cancelled. That time is free on the website again.";
  }
});

const go = (n) => { day = addDays(day, n); selected = null; sent = null; render(); };
$("prev").addEventListener("click", () => go(-1));
$("next").addEventListener("click", () => go(1));
dayIn.addEventListener("change", () => { if (dayIn.value) { day = dayIn.value; selected = null; render(); } });
$("reset").addEventListener("click", () => { resetDemo(); selected = null; render(); });

render();
