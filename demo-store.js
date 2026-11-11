// De-Vef Beauty · BOOKING PREVIEW (pitch demo)
// Shows how online booking would work for a shop with several chairs and long
// services. Nothing leaves the browser: sample bookings are generated from the
// date, and anything booked here is kept in this browser only (localStorage).
// TODO before going live: real hours, chairs and durations from De-Vef, and a
// real database (same approach as Lee's: Firebase + locked slots).

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
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { added: [], removed: [] }; } catch { return { added: [], removed: [] }; } };
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
    .sort((a, b) => a.start - b.start || a.chair - b.chair);
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

export function cancel(id) {
  const s = read();
  s.added = s.added.filter((b) => b.id !== id);
  if (id.startsWith("s_")) s.removed.push(id);
  write(s);
}

export function resetDemo() { try { localStorage.removeItem(KEY); } catch {} }
