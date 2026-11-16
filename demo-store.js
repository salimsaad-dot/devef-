// De-Vef Beauty · BOOKING PREVIEW (pitch demo)
// Shows how online booking would work for a shop with several chairs and long
// services. Nothing leaves the browser: sample bookings are generated from the
// date, and anything booked here is kept in this browser only (localStorage).
// TODO before going live: real hours, chairs and durations from De-Vef, and a
// real database (same approach as Lee's: Firebase + locked slots).

// DEMO: client booking messages go to Salim's own WhatsApp, not De-Vef's, so the
// pitch can show a real message arriving without sending her test bookings.
// Going live: change to De-Vef's number, 233546626332.
export const BOOKING_WA = "233577428684";

/** Ghana phone as typed ("024 123 4567", "+233 24…") -> "233241234567", or "" if it doesn't look right */
export function waNumber(phone = "") {
  let d = String(phone).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "233" + d.slice(1);
  else if (d.length === 9) d = "233" + d;
  return /^233\d{9}$/.test(d) ? d : "";
}

export const SAMPLE = {
  chairs: 3,                    // people who can work on clients at the same time
  openDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0 = Sunday)
  open: 8, close: 20,           // 8 am – 8 pm
  daysAhead: 60,
  minNoticeHours: 1,
};

// Rough appointment lengths in hours (sample; to confirm with the owner)
export const DURATION = {
  "Cornrows": 2, "Knotless braids": 6, "Curly braids": 5, "Frontal install": 3,
  "Weave-on": 3, "Manicure": 1, "Pedicure": 1, "Something else": 2,
};

const KEY = "devef-demo-v1";
const blank = () => ({ added: [], removed: [], confirmed: [] });
const read = () => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); } };
const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

/* ---------- Dates (Ghana = UTC all year) ---------- */
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const isOpenDay = (iso) => SAMPLE.openDays.includes(new Date(iso + "T12:00:00Z").getUTCDay());
export const lastDay = () => addDays(todayISO(), SAMPLE.daysAhead);
export const dayLabel = (iso, opts = { weekday: "long", day: "numeric", month: "long" }) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
export const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? " am" : " pm"}`;

/* ---------- Sample bookings (same every time for a given day) ---------- */
const NAMES = ["Abena Owusu", "Efua Mensah", "Akosua Boateng", "Nana Ama Asante", "Adwoa Darko", "Yaa Agyeman", "Esi Quaye",
  "Afua Sarpong", "Maame Addo", "Dzifa Agbeko", "Selorm Kpodo", "Naa Adjeley Tetteh", "Ewurabena Hagan", "Akua Frimpong", "Mawusi Dogbe"];
const NOTES = ["Medium size, waist length", "Bringing my own hair", "Red nails please", "Small knotless, bum length", "", "", "Same style as last time", "", "French tips", ""];
const POOL = ["Cornrows", "Knotless braids", "Curly braids", "Frontal install", "Weave-on", "Manicure", "Pedicure", "Cornrows", "Knotless braids", "Manicure"];

function rng(seed) { // small deterministic generator
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

function sampleFor(date) {
  if (!isOpenDay(date)) return [];
  const r = rng(date), out = [];
  const light = 1 + Math.floor(r() * SAMPLE.chairs); // one chair keeps its morning free, so long styles fit most days
  for (let chair = 1; chair <= SAMPLE.chairs; chair++) {
    let t = chair === light ? 14 + Math.floor(r() * 2) : SAMPLE.open + Math.floor(r() * 2);
    while (t < SAMPLE.close) {
      const service = POOL[Math.floor(r() * POOL.length)];
      const dur = DURATION[service];
      if (t + dur > SAMPLE.close) break;
      if (r() < 0.6) {
        const name = NAMES[Math.floor(r() * NAMES.length)];
        out.push({ id: `s_${date}_${chair}_${t}`, date, start: t, dur, chair, service, name,
          phone: `0${[24, 20, 54, 55, 59][Math.floor(r() * 5)]} ${String(100 + Math.floor(r() * 900))} ${String(1000 + Math.floor(r() * 9000))}`,
          notes: NOTES[Math.floor(r() * NOTES.length)], sample: true });
        // Samples more than 2 days ahead were booked long ago, so they're already confirmed
        out.at(-1).confirmed = date > addDays(todayISO(), 2) || [...out.at(-1).id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3 !== 0;
        t += dur;
      } else t += 2 + Math.floor(r() * 3); // chunky gaps, so long styles still find room
    }
  }
  return out;
}

/** All bookings on a day (sample + booked in this browser − cancelled), sorted by time */
export function bookingsOn(date) {
  const s = read();
  return [...sampleFor(date), ...s.added.filter((b) => b.date === date)]
    .filter((b) => !s.removed.includes(b.id))
    .map((b) => ({ ...b, confirmed: b.confirmed || s.confirmed.includes(b.id) }))
    .sort((a, b) => a.start - b.start || a.chair - b.chair);
}

/** Every booking from now until the last bookable day, soonest first (today: only ones not finished yet) */
export function upcoming() {
  const today = todayISO(), now = new Date().getUTCHours(), out = [];
  for (let d = today; d <= lastDay(); d = addDays(d, 1)) {
    for (const b of bookingsOn(d)) if (d > today || b.start + b.dur > now) out.push(b);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.chair - b.chair);
}

const freeChairs = (list, start, dur) => {
  const free = [];
  for (let c = 1; c <= SAMPLE.chairs; c++) {
    if (!list.some((b) => b.chair === c && b.start < start + dur && start < b.start + b.dur)) free.push(c);
  }
  return free;
};

/** Start times for a service on a day: { hour, free (chairs free for the whole appointment), tooSoon } */
export function startTimes(date, service) {
  const dur = DURATION[service] || 1;
  const list = bookingsOn(date);
  const cutoff = Date.now() + SAMPLE.minNoticeHours * 3600e3;
  const out = [];
  for (let h = SAMPLE.open; h + dur <= SAMPLE.close; h++) {
    out.push({ hour: h, free: freeChairs(list, h, dur).length, tooSoon: Date.parse(`${date}T${String(h).padStart(2, "0")}:00:00Z`) < cutoff });
  }
  return out;
}

export class FullError extends Error {}

/** Books the first chair that's free for the whole appointment (this browser only) */
export function book({ date, start, service, name, phone, notes, hair }) {
  const dur = DURATION[service] || 1;
  const [chair] = freeChairs(bookingsOn(date), start, dur);
  if (!chair) throw new FullError("That time has just filled up.");
  const s = read();
  const b = { id: `u_${Date.now()}`, date, start, dur, chair, service, name, phone, notes, hair, mine: true };
  s.added.push(b);
  write(s);
  return b;
}

/** True if one chair is free for the whole of start..start+dur (and it ends by closing time) */
export function chairFree(date, chair, start, dur) {
  if (start < SAMPLE.open || start + dur > SAMPLE.close) return false;
  return !bookingsOn(date).some((b) => b.chair === chair && b.start < start + dur && start < b.start + b.dur);
}

/** Owner blocks a chair for someone who walked in (this browser only). The website stops offering that time. */
export function addWalkIn({ date, start, chair, service, name }) {
  const dur = DURATION[service] || 1;
  if (!chairFree(date, chair, start, dur)) throw new FullError("That chair is busy then.");
  const s = read();
  const b = { id: `w_${Date.now()}`, date, start, dur, chair, service, name: name || "Walk-in", phone: "", notes: "", walkin: true, confirmed: true };
  s.added.push(b);
  write(s);
  return b;
}

/** The WhatsApp message the client sends De-Vef after booking (real version: wa.me/233546626332?text=...) */
export function bookingText(b) {
  return [
    "Hello De-Vef 👋🏾 I just booked on your website:",
    "",
    `*${b.service}*`,
    `${dayLabel(b.date)}, ${hourLabel(b.start)} – ${hourLabel(b.start + b.dur)}`,
    `Name: ${b.name}`,
    `Phone: ${b.phone}`,
    ...(b.hair ? [`Hair: ${b.hair}`] : []),
    ...(b.notes ? [`Notes: ${b.notes}`] : []),
  ].join("\n");
}

export function cancel(id) {
  const s = read();
  s.added = s.added.filter((b) => b.id !== id);
  s.confirmed = s.confirmed.filter((x) => x !== id);
  if (id.startsWith("s_")) s.removed.push(id);
  write(s);
}

/** Marks a booking as confirmed (the owner has sent the client a WhatsApp) */
export function confirmBooking(id) {
  const s = read();
  if (!s.confirmed.includes(id)) s.confirmed.push(id);
  write(s);
}

/** The WhatsApp message the owner sends to confirm (real version: wa.me/<client number>?text=...) */
export function confirmText(b) {
  const day = dayLabel(b.date, { weekday: "short", day: "numeric", month: "short" });
  return `Hi ${b.name.trim().split(/\s+/)[0]} 😊 Your ${b.service.toLowerCase()} on ${day} at ${hourLabel(b.start)} is confirmed. See you then! De-Vef Beauty`;
}

export function resetDemo() { try { localStorage.removeItem(KEY); } catch {} }
