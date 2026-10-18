"use strict";
/* =====================================================================================
   HSK 1–6 platform · core: data, storage, dates, audio, pinyin/meaning checking, SRS
   ===================================================================================== */
const DATA = /*__DATA__*/null;
const KEY = 'hsk5app.v1';                       // storage key kept from the HSK 5 app so existing progress carries over
const LEVELS = [1, 2, 3, 4, 5, 6];
const GROUP = 20, CGROUP = 10;
const BATCH = {1: 50, 2: 50, 3: 100, 4: 100, 5: 100, 6: 100};
const LEVEL_BLURB = {
  1: 'First steps: greetings, numbers, family, daily basics.',
  2: 'Everyday situations: travel, shopping, school and routines.',
  3: 'Common topics in longer sentences: health, plans, opinions.',
  4: 'Wider range of topics and connectors; reading short texts.',
  5: 'Abstract vocabulary, newspapers, formal connectors.',
  6: 'Advanced, formal and written Chinese; idioms and nuance.'};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[rnd(a.length)];
const sum = a => a.reduce((x, y) => x + y, 0);

/* ---------------- pinyin helpers (needed while building the level objects) ---------------- */
const TM = {'ā':'a1','á':'a2','ǎ':'a3','à':'a4','ē':'e1','é':'e2','ě':'e3','è':'e4','ī':'i1','í':'i2','ǐ':'i3','ì':'i4','ō':'o1','ó':'o2','ǒ':'o3','ò':'o4','ū':'u1','ú':'u2','ǔ':'u3','ù':'u4','ǖ':'ü1','ǘ':'ü2','ǚ':'ü3','ǜ':'ü4','ń':'n0','ň':'n0','ǹ':'n0','ḿ':'m0'};
const MARK = {a:'āáǎà', e:'ēéěè', i:'īíǐì', o:'ōóǒò', u:'ūúǔù', 'ü':'ǖǘǚǜ'};
const isV = c => 'aeiouü'.includes(c);
const stripTone = s => { let o = ''; for (const ch of s) o += TM[ch] ? TM[ch][0] : ch; return o; };
function normM(s) {
  return String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9' \-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(to be|to|be|a|an|the)\s+/, '').replace(/^(a|an|the)\s+/, '').trim();
}

/* ---------------- level objects: one independent database per level ---------------- */
const LV = {};
for (const n of LEVELS) {
  const raw = DATA.levels[n], L = {n, meta: raw.meta, W: [], C: [], byId: new Map(), byChar: new Map(), byHanzi: new Map()};
  for (const r of raw.w) {
    const w = Object.assign(r, {L: n, kind: 'w', sub: 'w:' + r.i, key: n + ':w:' + r.i});
    w.an = [...new Set((w.a || []).map(normM).filter(Boolean))];
    if (!w.an.length) w.an = [normM(w.e.replace(/[()]/g, ' '))].filter(Boolean);
    w.tl = stripTone(w.p).replace(/'/g, ''); w.mp = (w.pos || '').split('/')[0] || 'x';
    L.W.push(w); L.byId.set(w.i, w); L.byHanzi.set(w.h, w);
  }
  for (const r of raw.c) {
    const meaning = r.m || ('as in ' + r.w.slice(0, 3).join('、'));
    const c = {L: n, kind: 'c', sub: 'c:' + r.c, key: n + ':c:' + r.c, h: r.c, i: r.r, r: r.r, p: r.p[0], s: r.p[0], ok: [], alt: r.p.slice(1).map(p => [p, '']),
      allp: r.p, e: meaning, pos: 'character', mp: 'char', comp: r.k, words: r.w, n: r.n, f: r.f, nw: r.nw, hasMeaning: !!r.m};
    c.an = [...new Set(meaning.split(/[;,/]/).map(normM).filter(x => x && x.length < 40))]; c.tl = stripTone(c.p);
    L.C.push(c); L.byChar.set(c.h, c);
  }
  L.NB = Math.max(1, Math.floor(L.W.length / BATCH[n]));
  L.NCG = Math.ceil(L.C.length / CGROUP);
  LV[n] = L;
}
const itemByKey = k => { const [n, kind, id] = k.split(':'); const L = LV[+n]; if (!L) return null; return kind === 'w' ? L.byId.get(+id) : L.byChar.get(id); };

/* ---------------- storage (v2: per-level state; migrates the HSK 5 v1 progress) ---------------- */
function freshLevel() { return {groups: {}, cgroups: {}, items: {}, mist: {}, daily: {}, recall: {r: 0, t: 0}, examDate: null, planStart: null, mocks: [], mockCfg: null}; }
function fresh() { return {v: 2, theme: null, autoSpeak: false, rate: 0.85, levels: {}, session: null}; }
function migrate(o) {
  if (o && o.v === 2) return Object.assign(fresh(), o);
  if (!o || o.v !== 1) return fresh();
  const S2 = fresh(), L5 = S2.levels[5] = freshLevel(), today0 = o.start || null;
  const now = dnumToday();
  for (const [id, s] of Object.entries(o.words || {})) {
    L5.items['w:' + id] = {c: s.c || 0, w: s.w || 0, last: s.last || 0, seen: s.seen || 0, box: s.seen ? (s.c >= 3 && s.c / Math.max(1, s.c + s.w) >= .8 ? 3 : 1) : 0, due: s.seen ? now : 0};
  }
  for (const [id, t] of Object.entries(o.star || {})) (L5.items['w:' + id] || (L5.items['w:' + id] = {c: 0, w: 0, last: 0, seen: 0, box: 0, due: 0})).star = t;
  L5.groups = o.groups || {};
  L5.daily = o.daily || {};
  L5.recall = o.recall || {r: 0, t: 0};
  L5.examDate = o.examDate || '2026-10-17';
  L5.planStart = today0;
  for (const [k, m] of Object.entries(o.mist || {})) {
    if (k.startsWith('5:')) L5.mist['w:' + k.slice(2)] = m;
    else if (k.startsWith('4:')) { const w = LV[4].byHanzi.get(k.slice(2)); if (w) { const L4 = S2.levels[4] || (S2.levels[4] = freshLevel()); L4.mist['w:' + w.i] = m; } }
  }
  S2.theme = o.theme || null; S2.autoSpeak = !!o.autoSpeak; S2.rate = o.rate || .85;
  S2.migratedFrom = 1;
  return S2;
}
function load() {
  try { const t = localStorage.getItem(KEY); if (t) return migrate(JSON.parse(t)); } catch (e) {}
  return fresh();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------------- dates (Asia/Shanghai, where HSK is administered) ---------------- */
function today() {
  try { const dbg = localStorage.getItem(KEY + '.debugDate'); if (dbg) return dbg; } catch (e) {}
  const p = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
  const g = t => p.find(x => x.type === t).value;
  return g('year') + '-' + g('month') + '-' + g('day');
}
const dnum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const dnumToday = () => dnum(today());
const isoOf = n => new Date(n * 864e5).toISOString().slice(0, 10);
const fmtDate = s => { const [y, m, d] = s.split('-').map(Number); return new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(y, m - 1, d))); };
const fmtShort = s => { const [y, m, d] = s.split('-').map(Number); return new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(Date.UTC(y, m - 1, d))); };

let S = load();
const LS = n => S.levels[n] || (S.levels[n] = freshLevel());

/* ---------------- icons ---------------- */
const svg = (p, fill) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="${fill || 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a4.5 4.5 0 0 1 0 7M19 6a8 8 0 0 1 0 12"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  chart: svg('<path d="M4 20h16M7 16v-5M12 16V7M17 16v-8"/>'),
  gear: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  book: svg('<path d="M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h9"/>'),
  repeat: svg('<path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 0 1-3 3H4"/>'),
  keys: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
  alert: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16h.01"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  layers: svg('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>'),
  moon: svg('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  grid: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/>'),
  cards: svg('<rect x="6" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h10"/>'),
  target: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
  doc: svg('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
  cal: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  home: svg('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  bars: svg('<path d="M4 6h16M4 12h10M4 18h6"/>'),
};

/* ---------------- audio (Web Speech; offline when the device has a Chinese voice) ---------------- */
let ZH = null;
const hasTTS = 'speechSynthesis' in window;
function findVoice() {
  if (!hasTTS) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /zh[-_]CN/i.test(v.lang) && v.localService) || vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) || null;
}
if (hasTTS) { ZH = findVoice(); speechSynthesis.onvoiceschanged = () => { const had = !!ZH; ZH = findVoice(); if (!had && ZH && typeof render === 'function') render(); }; }
function speak(t) {
  if (!ZH || !t) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = ZH; u.lang = ZH.lang; u.rate = S.rate || .85; speechSynthesis.speak(u); } catch (e) {}
}

/* ---------------- pinyin checking ---------------- */
function canon(str) {
  let s = String(str).normalize('NFC').toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
  let letters = '', marks = [], barrier = 0;
  for (const ch of s) {
    if (TM[ch]) { const b = TM[ch][0], t = +TM[ch][1]; if (t) marks.push([letters.length, t]); letters += b; }
    else if (ch >= 'a' && ch <= 'z' || ch === 'ü') letters += ch;
    else if (ch >= '0' && ch <= '5') {
      const t = +ch; let e = letters.length;
      while (e > barrier && 'ngr'.includes(letters[e - 1])) e--;
      let b = e; while (b > barrier && isV(letters[b - 1])) b--;
      if (t >= 1 && t <= 4 && b < e) {
        const run = letters.slice(b, e); let k = run.indexOf('a');
        if (k < 0) k = run.indexOf('e'); if (k < 0 && run.includes('ou')) k = run.indexOf('o'); if (k < 0) k = run.length - 1;
        marks.push([b + k, t]);
      }
      barrier = letters.length;
    }
  }
  letters = letters.replace(/([jqxy])ü/g, '$1u');
  const runOf = []; let r = -1, prevV = false;
  for (let i = 0; i < letters.length; i++) { const v = isV(letters[i]); if (v && !prevV) r++; runOf[i] = v ? r : -1; prevV = v; }
  marks.sort((a, b) => a[0] - b[0]);
  return {letters, sig: letters + '|' + marks.map(m => runOf[m[0]] + ':' + m[1]).join(',')};
}
function readings(w) {
  const rs = [w.p].concat(w.ok || [], (w.alt || []).map(a => a[0]));
  if (w.h.endsWith('儿')) rs.slice().forEach(r => { if (r.endsWith('r')) rs.push(r.slice(0, -1) + 'er'); });
  return rs;
}
function checkPinyin(input, w) {
  const c = canon(input); if (!c.letters) return {res: 'wrong'};
  const rs = readings(w);
  for (const r of rs) if (canon(r).sig === c.sig) return {res: 'ok', match: r};
  if (!/[aeiouü]/.test(c.letters)) for (const r of rs) if (canon(r).letters === c.letters) return {res: 'ok', match: r};
  for (const r of rs) if (canon(r).letters === c.letters) return {res: 'almost', match: r};
  return {res: 'wrong'};
}
function sylTone(syl) { for (const ch of syl) if (TM[ch] && +TM[ch][1]) return +TM[ch][1]; return 0; }
function setTone(base, t) {
  if (!t) return base;
  let k = base.indexOf('a'); if (k < 0) k = base.indexOf('e'); if (k < 0 && base.includes('ou')) k = base.indexOf('o');
  if (k < 0) for (let i = base.length - 1; i >= 0; i--) if (isV(base[i])) { k = i; break; }
  return k < 0 ? base : base.slice(0, k) + MARK[base[k]][t - 1] + base.slice(k + 1);
}
const joinSyl = a => a.reduce((o, s, i) => o + (i && 'aeo'.includes(stripTone(s)[0]) ? "'" : '') + s, '');
function pinyinDistractors(w) {
  const syl = String(w.s || w.p).split(' '), base = syl.map(stripTone), tones = syl.map(sylTone), out = new Set();
  const okSig = new Set(readings(w).map(r => canon(r).sig));
  const add = (b, t) => { const p = joinSyl(b.map((x, i) => setTone(x, t[i]))); if (!okSig.has(canon(p).sig)) out.add(p); };
  for (let i = 0; i < syl.length; i++) for (let t = (syl.length > 1 ? 0 : 1); t <= 4; t++) if (t !== tones[i]) { const tt = tones.slice(); tt[i] = t; if (t || i) add(base, tt); }
  if (syl.length > 1) for (let n = 0; n < 6; n++) { const tt = tones.map(t => Math.random() < .5 ? 1 + rnd(4) : t); add(base, tt); }
  const tone = shuffle([...out]);
  const snd = new Set(), swaps = [[/^zh/, 'z'], [/^ch/, 'c'], [/^sh/, 's'], [/^z(?!h)/, 'zh'], [/^c(?!h)/, 'ch'], [/^s(?!h)/, 'sh'], [/^n(?=[aeiouü])/, 'l'], [/^l/, 'n'], [/ng$/, 'n'], [/([aei])n$/, '$1ng']];
  for (let i = 0; i < base.length; i++) for (const [re, to] of swaps) if (re.test(base[i])) {
    const b = base.slice(); b[i] = b[i].replace(re, to); const p = joinSyl(b.map((x, j) => setTone(x, tones[j])));
    if (!okSig.has(canon(p).sig)) snd.add(p);
  }
  const s2 = shuffle([...snd]), res = [];
  if (s2.length) res.push(s2[0]);
  for (const p of tone) { if (res.length >= 3) break; if (!res.includes(p)) res.push(p); }
  for (const p of s2) { if (res.length >= 3) break; if (!res.includes(p)) res.push(p); }
  return res.slice(0, 3);
}
const canPinyin = w => /[aeiouü]/.test(stripTone(w.p)) && w.pos !== 'interj.';

/* ---------------- meaning checking ---------------- */
function checkMeaning(input, w) {
  const parts = [input].concat(String(input).split(/[;,\/]|\bor\b/)).map(normM).filter(Boolean);
  return parts.some(p => w.an.includes(p));
}

/* ---------------- distractors (always drawn from the same level and the same kind) ---------------- */
const STOP = new Set(['the', 'for', 'and', 'one', 'with', 'that', 'not', 'measure', 'word', 'something', 'someone', "one's", 'make', 'take', 'have', 'sth', 'used']);
const toks = w => w._tk || (w._tk = new Set(w.an.join(' ').split(' ').filter(t => t.length > 2 && !STOP.has(t))));
const shareChar = (a, b) => [...a.h].some(c => b.h.includes(c));
const syn = (a, b) => a.an.some(x => b.an.includes(x));
const overlap = (a, b) => [...toks(a)].some(t => toks(b).has(t));
function distract(w, mode) {
  const pool = w.kind === 'c' ? LV[w.L].C : LV[w.L].W, sc = [];
  for (const c of pool) {
    if (c === w || c.h === w.h) continue;
    let s = Math.random() * 2;
    if (mode === 'h2m') { if (syn(w, c) || c.e === w.e) continue; s += (c.mp === w.mp ? 3 : 0) + (shareChar(w, c) ? 2 : 0) + (overlap(w, c) ? 2 : 0); }
    else if (mode === 'm2h') { const hom = c.tl === w.tl; if (!hom && (c.an[0] === w.an[0] || c.e === w.e)) continue; s += (hom ? 6 : 0) + (shareChar(w, c) ? 3 : 0) + (c.h[0] === w.h[0] ? 2 : 0) + (c.h.length === w.h.length ? 1 : 0) + (c.mp === w.mp ? 1.5 : 0); }
    else { if (syn(w, c) || overlap(w, c) || (w.z && w.z.includes(c.h))) continue; s += (c.mp === w.mp ? 3 : 0) + (c.h.length === w.h.length ? 1 : 0); }
    sc.push([s, c]);
  }
  sc.sort((a, b) => b[0] - a[0]);
  const top = mode === 'm2h' ? sc.slice(0, 5) : sc.slice(0, 10), res = [];
  for (const [, c] of shuffle(top).sort((a, b) => (mode === 'm2h' ? b[0] - a[0] : 0))) {
    if (res.length >= 3) break;
    if (!res.some(r => r.e === c.e || r.h === c.h)) res.push(c);
  }
  return res;
}

/* ---------------- spaced repetition (Leitner boxes) + item status ---------------- */
const INTERVAL = [0, 1, 2, 4, 7, 15, 30, 60];      // days until the next review for boxes 0..7
const ist = (n, sub) => { const it = LS(n).items; return it[sub] || (it[sub] = {c: 0, w: 0, last: 0, seen: 0, box: 0, due: 0}); };
const istOf = x => ist(x.L, x.sub);
const peekSt = x => (S.levels[x.L] && S.levels[x.L].items[x.sub]) || null;
function markSeen(x) { const s = istOf(x); if (!s.seen) { s.seen = 1; s.box = Math.max(s.box, 1); s.due = dnumToday() + 1; s.firstSeen = today(); } }
function srsUpdate(x, ok) {
  const s = istOf(x), t = dnumToday();
  s.seen = 1;
  if (ok) { s.box = Math.min(7, Math.max(1, s.box) + 1); s.due = t + INTERVAL[s.box]; }
  else { s.box = 1; s.due = t + 1; }
}
const isMist = x => { const m = S.levels[x.L] && S.levels[x.L].mist[x.sub]; return !!(m && !m.res); };
function status(x) {
  const s = peekSt(x);
  if (!s || !s.seen) return 'new';
  if (isMist(x)) return 'mistake';
  return s.box >= 4 ? 'mastered' : 'learning';
}
const isDue = x => { const s = peekSt(x); return !!(s && s.seen && s.due <= dnumToday()); };
const starred = x => { const s = peekSt(x); return !!(s && s.star); };
const studiedW = n => LV[n].W.filter(w => { const s = peekSt(w); return s && s.seen; });
const studiedC = n => LV[n].C.filter(c => { const s = peekSt(c); return s && s.seen; });
