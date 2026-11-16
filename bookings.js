// De-Vef Beauty · owner's bookings page (PREVIEW: sample data, this browser only)
import { SAMPLE, todayISO, addDays, lastDay, isOpenDay, dayLabel, hourLabel, bookingsOn, cancel, resetDemo, upcoming, confirmBooking, confirmText, waNumber, DURATION, chairFree, addWalkIn, FullError } from "./demo-store.js";

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
let sentReal = false; // true if WhatsApp was really opened for it
let walk = null;  // { chair, start, service, name } while the "Add walk-in" form is open
const nowHour = () => new Date().getUTCHours(); // Ghana = UTC
let upMode = "wait"; // "wait" = to confirm, "all" = everything coming up
let upShow = 5;

dayIn.min = todayISO();
dayIn.max = lastDay();

function shortDay(iso) {
  if (iso === todayISO()) return "Today";
  if (iso === addDays(todayISO(), 1)) return "Tomorrow";
  return dayLabel(iso, { weekday: "short", day: "numeric", month: "short" });
}

function renderUpcoming() {
  const all = upcoming();
  const waiting = all.filter((b) => !b.confirmed);
  const list = upMode === "wait" ? waiting : all;
  $("upWait").textContent = `To confirm (${waiting.length})`;
  $("upWait").setAttribute("aria-pressed", upMode === "wait");
  $("upAll").setAttribute("aria-pressed", upMode === "all");
  $("upList").innerHTML = list.length
    ? list.slice(0, upShow).map((b) => `
      <li><button type="button" class="up-row${b.id === selected ? " is-sel" : ""}" data-go="${esc(b.id)}" data-date="${esc(b.date)}">
        <span class="up-when"><b>${esc(shortDay(b.date))}</b>${hourLabel(b.start)}</span>
        <span class="up-what"><b>${esc(b.service)}</b>${esc(first(b.name))}${b.mine ? ` <em class="up-new">New</em>` : ""}${b.walkin ? ` <em class="up-walk">Walk-in</em>` : ""}</span>
        <span class="up-state ${b.confirmed ? "is-ok" : "is-wait"}">${b.confirmed
          ? `<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span class="sr-only">Confirmed</span>`
          : `<i class="fa-regular fa-clock" aria-hidden="true"></i> Confirm`}</span>
      </button></li>`).join("")
    : `<li class="up-empty">${upMode === "wait" ? "Nothing waiting. You're all caught up." : "No bookings coming up."}</li>`;
  $("upMore").hidden = list.length <= upShow;
  $("upMore").textContent = `Show more (${list.length - upShow} more)`;
}

function render() {
  renderUpcoming();
  dayIn.value = day;
  $("prev").disabled = day <= todayISO();
  $("next").disabled = day >= lastDay();
  $("dayTitle").textContent = day === todayISO() ? "Today" : day === addDays(todayISO(), 1) ? "Tomorrow" : dayLabel(day, { weekday: "long" });
  const list = bookingsOn(day);
  if (!isOpenDay(day)) {
    $("count").textContent = `${dayLabel(day)} · Closed`;
    board.innerHTML = `<p class="board-empty">Closed on Sundays.</p>`;
    walk = null;
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
      ${chairs.map((c) => `<div class="board-col" data-chair="${c}">${list.filter((b) => b.chair === c).map((b) => `
        <button type="button" class="appt${b.mine ? " is-new" : ""}${b.confirmed ? "" : " is-pending"}${b.walkin ? " is-walkin" : ""}${b.id === selected ? " is-sel" : ""}" data-id="${esc(b.id)}"
          style="--start:${b.start - SAMPLE.open};--dur:${b.dur}" aria-label="${esc(`${hourLabel(b.start)} to ${hourLabel(b.start + b.dur)}, ${b.service}, ${b.name}${b.confirmed ? ", confirmed" : ", not confirmed yet"}`)}">
          <span class="appt-time">${hourLabel(b.start)}–${hourLabel(b.start + b.dur)}</span>
          <span class="appt-svc">${esc(b.service)}</span>
          <span class="appt-name">${esc(first(b.name))}</span>
          ${b.mine ? `<span class="appt-new">New</span>` : ""}${b.walkin ? `<span class="appt-new">Walk-in</span>` : ""}
        </button>`).join("")}</div>`).join("")}
    </div>`;
  if (walk) showWalkIn(); else showDetail(list.find((b) => b.id === selected));
}

/* ---------- Add walk-in ---------- */
function defaultWalk() {
  const start = day === todayISO() ? Math.max(SAMPLE.open, Math.min(nowHour(), SAMPLE.close - 1)) : SAMPLE.open;
  for (let c = 1; c <= SAMPLE.chairs; c++) if (chairFree(day, c, start, 1)) return { chair: c, start };
  return { chair: 1, start };
}

function showWalkIn() {
  const hours = [];
  for (let h = SAMPLE.open; h < SAMPLE.close; h++) hours.push(h);
  const opt = (v, label, sel) => `<option value="${v}"${sel ? " selected" : ""}>${label}</option>`;
  detail.innerHTML = `
    <div class="detail-top">
      <div>
        <p class="detail-when">${esc(dayLabel(day))}</p>
        <h2>Add a walk-in</h2>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <p class="walk-intro">Someone just sat down? Block the chair here and the website stops offering that time.</p>
    <form class="walk-form" id="walkForm" novalidate>
      <div class="f"><label for="wService">Service</label>
        <select id="wService">${Object.keys(DURATION).map((s) => opt(s, `${s} (${DURATION[s]}h)`, s === (walk.service || "Cornrows"))).join("")}</select></div>
      <div class="f"><label for="wChair">Chair</label>
        <select id="wChair">${Array.from({ length: SAMPLE.chairs }, (_, i) => opt(i + 1, `Chair ${i + 1}`, i + 1 === walk.chair)).join("")}</select></div>
      <div class="f"><label for="wStart">Start</label>
        <select id="wStart">${hours.map((h) => opt(h, hourLabel(h), h === walk.start)).join("")}</select></div>
      <div class="f"><label for="wName">Name <span class="opt">(optional)</span></label>
        <input id="wName" type="text" maxlength="60" placeholder="Walk-in" value="${esc(walk.name || "")}" /></div>
      <p class="err" id="wErr" role="alert"></p>
      <button class="btn btn-block" type="submit"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Block this chair</button>
    </form>`;
  detail.hidden = false;
}

function openWalkIn(pre) {
  walk = pre || defaultWalk();
  selected = null; sent = null;
  render();
  detail.focus({ preventScroll: true });
  detail.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
      <p class="wa-label">${sentReal
        ? `Opened in WhatsApp to ${esc(b.phone)}. Tap Send there.`
        : `Sent to ${esc(first(b.name))} on WhatsApp (sample client: nothing was really sent)`}</p>
      <p class="wa-bubble">${esc(confirmText(b))}</p>
    </div>` : ""}`;
  detail.hidden = false;
}

board.addEventListener("click", (e) => {
  const a = e.target.closest(".appt");
  if (!a) {
    // Tap on an empty spot in a chair column: add a walk-in there
    const col = e.target.closest(".board-col");
    if (!col) return;
    const r = col.getBoundingClientRect();
    const start = SAMPLE.open + Math.floor((e.clientY - r.top) / (r.height / (SAMPLE.close - SAMPLE.open)));
    openWalkIn({ chair: Number(col.dataset.chair), start: Math.min(Math.max(start, SAMPLE.open), SAMPLE.close - 1) });
    return;
  }
  selected = a.dataset.id;
  sent = null; walk = null;
  render();
  detail.focus({ preventScroll: true });
  detail.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

detail.addEventListener("click", (e) => {
  const note = $("detailNote");
  if (e.target.closest("[data-close]")) { selected = null; walk = null; render(); return; }
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
    // Bookings made on the site open WhatsApp to the number the client typed.
    // Sample bookings never do: their made-up numbers could belong to real people.
    const b = bookingsOn(day).find((x) => x.id === ok.dataset.confirm);
    const to = b && b.mine ? waNumber(b.phone) : "";
    if (to) window.open(`https://wa.me/${to}?text=${encodeURIComponent(confirmText(b))}`, "_blank", "noopener");
    sentReal = Boolean(to);
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

detail.addEventListener("submit", (e) => {
  if (e.target.id !== "walkForm") return;
  e.preventDefault();
  const v = { service: $("wService").value, chair: Number($("wChair").value), start: Number($("wStart").value), name: $("wName").value.trim() };
  try {
    const b = addWalkIn({ date: day, ...v });
    walk = null; selected = b.id;
    render();
    $("count").textContent += ` · Walk-in added. Chair ${b.chair} is blocked ${hourLabel(b.start)}–${hourLabel(b.start + b.dur)} on the website.`;
  } catch (x) {
    if (!(x instanceof FullError)) throw x;
    walk = v;
    const dur = DURATION[v.service];
    $("wErr").textContent = v.start + dur > SAMPLE.close
      ? `${v.service} takes about ${dur}h, so it won't finish before closing. Pick an earlier start.`
      : `Chair ${v.chair} is busy during ${hourLabel(v.start)}–${hourLabel(v.start + dur)}. Try another chair or time.`;
  }
});
detail.addEventListener("change", (e) => {
  if (!walk || !e.target.closest("#walkForm")) return;
  walk = { service: $("wService").value, chair: Number($("wChair").value), start: Number($("wStart").value), name: $("wName").value };
  $("wErr").textContent = "";
});
$("addWalk").addEventListener("click", () => openWalkIn());

// Upcoming list: tap a booking to jump to its day and open it
$("upList").addEventListener("click", (e) => {
  const r = e.target.closest("[data-go]");
  if (!r) return;
  day = r.dataset.date; selected = r.dataset.go; sent = null; walk = null;
  render();
  detail.focus({ preventScroll: true });
  detail.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});
$("upWait").addEventListener("click", () => { upMode = "wait"; upShow = 5; renderUpcoming(); });
$("upAll").addEventListener("click", () => { upMode = "all"; upShow = 5; renderUpcoming(); });
$("upMore").addEventListener("click", () => { upShow += 10; renderUpcoming(); });

const go = (n) => { day = addDays(day, n); selected = null; sent = null; walk = null; render(); };
$("prev").addEventListener("click", () => go(-1));
$("next").addEventListener("click", () => go(1));
dayIn.addEventListener("change", () => { if (dayIn.value) { day = dayIn.value; selected = null; walk = null; render(); } });
$("reset").addEventListener("click", () => { resetDemo(); selected = null; walk = null; render(); });

render();
