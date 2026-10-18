/* =====================================================================================
   Learning engine: batches & groups, answer recording, mistakes, question generation, sessions
   ===================================================================================== */

/* ---------------- vocabulary batches (rank order) and character groups ---------------- */
const batchOf = w => Math.min(LV[w.L].NB, Math.floor((w.i - 1) / BATCH[w.L]) + 1);
const batchWords = (n, d) => LV[n].W.filter(w => batchOf(w) === d);
function groupsOf(n, d) {
  const ws = batchWords(n, d), out = [];
  for (let i = 0; i < ws.length; i += GROUP) out.push(ws.slice(i, i + GROUP));
  if (out.length > 1 && out[out.length - 1].length < GROUP / 2) out[out.length - 2].push(...out.pop());
  return out;
}
const gstate = (n, d, g) => LS(n).groups[d + '-' + g] || {};
const batchDone = (n, d) => groupsOf(n, d).every((_, g) => gstate(n, d, g).done);
const batchProgress = (n, d) => groupsOf(n, d).reduce((t, ws, g) => t + (gstate(n, d, g).done ? ws.length : 0), 0);
function currentBatch(n) { for (let d = 1; d <= LV[n].NB; d++) if (!batchDone(n, d)) return d; return null; }
const CG_CACHE = {};
function charGroups(n) {
  if (CG_CACHE[n]) return CG_CACHE[n];
  const C = LV[n].C, out = [];
  for (let i = 0; i < C.length; i += CGROUP) out.push(C.slice(i, i + CGROUP));
  if (out.length > 1 && out[out.length - 1].length < CGROUP / 2) out[out.length - 2].push(...out.pop());   // tiny last group merged
  return (CG_CACHE[n] = out);
}
const cgroupChars = (n, g) => charGroups(n)[g] || [];
const charGroupCount = n => charGroups(n).length;
const cgstate = (n, g) => LS(n).cgroups[g] || {};
function currentCGroup(n) { for (let g = 0; g < charGroupCount(n); g++) if (!cgstate(n, g).done) return g; return null; }

/* ---------------- recording answers, mistakes ---------------- */
const LAB = {h2m: 'meaning', m2h: 'choose the word', cloze: 'fill in the blank', h2p: 'choose pinyin', type: 'type pinyin', listen: 'listening (word)',
  tr: 'sentence meaning', lsent: 'listening (sentence)', order: 'sentence order', cword: 'word with this character', rp: 'recall · pinyin', rm: 'recall · meaning', card: 'flashcard'};
function record(x, ok, type, given, correct, sid, sec, srs) {
  const ls = LS(x.L), d = today();
  const dl = ls.daily[d] || (ls.daily[d] = {n: 0, ok: 0}); dl.n++; if (ok) dl.ok++;
  const tt = ls.types || (ls.types = {}), ty = tt[type] || (tt[type] = {c: 0, w: 0}); ok ? ty.c++ : ty.w++;
  const s = istOf(x); ok ? s.c++ : s.w++; s.last = Date.now();
  if (srs !== false) srsUpdate(x, ok); else s.seen = 1;
  let m = ls.mist[x.sub];
  if (!ok) {
    m = m || (ls.mist[x.sub] = {n: 0, streak: 0, sid: null, bad: null, res: false, log: []});
    m.n++; m.streak = 0; m.res = false; m.sid = null; m.bad = sid;
    m.log.push({t: Date.now(), d, sec, type, given: String(given).slice(0, 80), correct: String(correct).slice(0, 120)});
    if (m.log.length > 30) m.log.shift();
  } else if (m && !m.res && m.bad !== sid && m.sid !== sid) {
    m.streak++; m.sid = sid;
    if (m.streak >= 3) { m.res = true; m.resT = Date.now(); }
  }
}
const activeMist = n => Object.keys(LS(n).mist).filter(sub => !LS(n).mist[sub].res).map(sub => itemByKey(n + ':' + sub)).filter(Boolean);

/* ---------------- question types ---------------- */
function typesFor(x) {
  if (x.kind === 'c') return (x.hasMeaning ? ['h2m', 'm2h'] : []).concat(['h2p', 'type', 'cword']).concat(ZH && canPinyin(x) ? ['listen'] : []);
  const t = ['h2m', 'm2h'];
  if (x.z) t.push('cloze', 'tr');
  if (canPinyin(x)) t.push('h2p', 'type');
  if (ZH && canPinyin(x)) t.push('listen');
  if (ZH && x.z) t.push('lsent');
  if (x.zt) t.push('order');
  return t;
}
function twoTypes(x) {
  const avail = typesFor(x);
  const meaningT = avail.filter(t => ['h2m', 'm2h', 'cloze', 'cword'].includes(t));
  const a = pick(meaningT.flatMap(t => t === 'h2m' || t === 'cloze' ? [t, t, t] : [t, t]));
  const rest = avail.filter(t => t !== a);
  const weights = {h2m: 1, m2h: 2, cloze: 2, h2p: 2, type: 3, listen: 3, tr: 2, lsent: 1, order: 2, cword: 2};
  return [a, pick(rest.flatMap(t => Array(weights[t] || 1).fill(t)))];
}
function anyType(x, notType) {
  const avail = typesFor(x).filter(t => t !== notType);
  return pick(avail.length ? avail : typesFor(x));
}
const MEANING_ONLY = new Set(['h2m', 'm2h', 'cloze', 'tr', 'cword']);
function gen(item) {
  const x = itemByKey(item.k); let type = item.type;
  if (!typesFor(x).includes(type)) type = typesFor(x)[0];
  const isC = x.kind === 'c', what = isC ? 'character' : 'word';
  const base = {k: item.k, type};
  if (type === 'h2m') { const o = shuffle([x, ...distract(x, 'h2m')]); return Object.assign(base, {mode: 'mc', lab: `Choose the meaning of this ${what}`, big: x.h, opts: o.map(y => y.e), ans: o.indexOf(x), correct: x.e}); }
  if (type === 'm2h') { const o = shuffle([x, ...distract(x, 'm2h')]); return Object.assign(base, {mode: 'mc', zh: 1, lab: `Choose the ${what}`, mid: x.e, sub: x.pos, opts: o.map(y => y.h), ans: o.indexOf(x), correct: x.h}); }
  if (type === 'cloze') { const o = shuffle([x, ...distract(x, 'cloze')]); return Object.assign(base, {mode: 'mc', zh: 1, lab: 'Fill in the blank', sent: x.z.split(x.h), opts: o.map(y => y.h), ans: o.indexOf(x), correct: x.h}); }
  if (type === 'listen') { const o = shuffle([x, ...distract(x, 'm2h')]); return Object.assign(base, {mode: 'mc', zh: 1, lab: `Listen and choose the ${what}`, listen: x.h, opts: o.map(y => y.h), ans: o.indexOf(x), correct: x.h}); }
  if (type === 'h2p') { const ds = pinyinDistractors(x); if (ds.length < 3) return gen({k: item.k, type: isC ? 'cword' : 'h2m'}); const o = shuffle([x.p, ...ds]); return Object.assign(base, {mode: 'mc', lab: 'Choose the pinyin', big: x.h, opts: o, ans: o.indexOf(x.p), correct: x.p}); }
  if (type === 'tr' || type === 'lsent') {
    const pool = shuffle(LV[x.L].W.filter(y => y.ze && y.ze !== x.ze && y !== x)).slice(0, 40)
      .sort((a, b) => Math.abs(a.ze.length - x.ze.length) - Math.abs(b.ze.length - x.ze.length)).slice(0, 3);
    const o = shuffle([x.ze, ...pool.map(y => y.ze)]);
    return Object.assign(base, {mode: 'mc', lab: type === 'tr' ? 'What does this sentence mean?' : 'Listen: what does the sentence mean?', sentence: type === 'tr' ? x.z : null, listen: type === 'lsent' ? x.z : null, opts: o, ans: o.indexOf(x.ze), correct: x.ze, small: 1});
  }
  if (type === 'order') {
    let ch = shuffle(x.zt.c); for (let t = 0; t < 5 && ch.join('') === x.zt.c.join(''); t++) ch = shuffle(x.zt.c);
    return Object.assign(base, {mode: 'order', lab: 'Put the parts in the right order', chunks: ch, end: x.zt.end, picked: [], correct: x.zt.c.join('') + x.zt.end, hint: x.ze});
  }
  if (type === 'cword') {
    const yes = x.words.filter(h => h !== x.h); const right = pick(yes.length ? yes : x.words);
    const others = shuffle(LV[x.L].W.filter(y => !y.h.includes(x.h) && Math.abs(y.h.length - right.length) <= 1)).slice(0, 3).map(y => y.h);
    const o = shuffle([right, ...others]);
    return Object.assign(base, {mode: 'mc', zh: 1, lab: 'Which word contains this character?', big: x.h, opts: o, ans: o.indexOf(right), correct: right});
  }
  return Object.assign(base, {type: 'type', mode: 'type', lab: 'Type the pinyin (tone marks or numbers)', big: x.h, correct: x.p});
}

/* ---------------- sessions ---------------- */
const newSid = () => Date.now().toString(36) + rnd(1e6).toString(36);
function startSession(kind, level, title, items, extra) {
  if (!items.length) { toast('Nothing to practise here yet.'); return; }
  S.session = Object.assign({kind, level, title, sid: newSid(), q: items, pos: 0, right: 0, total: items.length, missed: [], cur: null, sec: title, srsDone: {}}, extra || {});
  save(); go('quiz');
}
function startGroup(n, d, g) {
  const ws = groupsOf(n, d)[g], a = [], b = [];
  ws.forEach(w => { markSeen(w); const [t1, t2] = twoTypes(w); a.push({k: w.key, type: t1, first: 1}); b.push({k: w.key, type: t2, first: 1}); });
  const k = d + '-' + g; LS(n).groups[k] = Object.assign(LS(n).groups[k] || {}, {learned: true});
  startSession('group', n, `HSK ${n} · Batch ${d} · Group ${g + 1}`, shuffle(a).concat(shuffle(b)), {d, g});
}
function startCGroup(n, g) {
  const cs = cgroupChars(n, g), a = [], b = [];
  cs.forEach(c => { markSeen(c); const [t1, t2] = twoTypes(c); a.push({k: c.key, type: t1, first: 1}); b.push({k: c.key, type: t2, first: 1}); });
  LS(n).cgroups[g] = Object.assign(LS(n).cgroups[g] || {}, {learned: true});
  startSession('cgroup', n, `HSK ${n} · Characters · Group ${g + 1}`, shuffle(a).concat(shuffle(b)), {g});
}
function dueItems(n) {
  const t = dnumToday(), out = [];
  for (const x of LV[n].W.concat(LV[n].C)) { const s = peekSt(x); if (s && s.seen && s.due <= t) out.push(x); }
  return out;
}
function reviewItems(levels, max) {
  if (levels.length > 1) {                                    // cross-level: share the session fairly between levels
    const per = levels.map(n => reviewItems([n], max)), out = [];
    for (let i = 0; out.length < max && per.some(a => a.length > i); i++) per.forEach(a => { if (a[i] && out.length < max) out.push(a[i]); });
    return shuffle(out);
  }
  let due = levels.flatMap(dueItems);
  due.sort((a, b) => { const sa = peekSt(a), sb = peekSt(b); return (sa.due - sb.due) || (sb.w - sa.w) || (sa.box - sb.box); });
  let items = due.slice(0, max);
  if (items.length < Math.min(10, max)) {                    // nothing (much) due: review ahead, weakest first
    const extra = levels.flatMap(n => LV[n].W.concat(LV[n].C)).filter(x => { const s = peekSt(x); return s && s.seen && !items.includes(x); })
      .sort((a, b) => { const sa = peekSt(a), sb = peekSt(b); return (sa.box - sb.box) || (sb.w - sa.w) || (sa.due - sb.due); });
    items = items.concat(extra.slice(0, Math.min(10, max) - items.length));
  }
  return shuffle(items);
}
function startReview(n) {
  const xs = reviewItems([n], 30);
  startSession('review', n, `HSK ${n} · Review`, xs.map(x => ({k: x.key, type: anyType(x), first: 1})));
}
function startCrossReview() {
  const lv = LEVELS.filter(n => studiedW(n).length || studiedC(n).length);
  const xs = reviewItems(lv, 40);
  startSession('review', 'x', 'Cross-level review (mixed levels)', xs.map(x => ({k: x.key, type: anyType(x), first: 1})));
}
function startMistakes(n) {
  const xs = shuffle(activeMist(n)).slice(0, 40);
  startSession('mist', n, `HSK ${n} · My mistakes`, xs.map(x => { const lg = LS(n).mist[x.sub].log, last = lg[lg.length - 1] || {};
    return {k: x.key, type: typesFor(x).includes(last.type) && Math.random() < .6 ? last.type : anyType(x), first: 1}; }));
}
function startStarred(n) {
  const xs = shuffle(LV[n].W.concat(LV[n].C).filter(starred)).slice(0, 40);
  startSession('star', n, `HSK ${n} · Starred`, xs.map(x => ({k: x.key, type: anyType(x), first: 1})));
}
function startPractice(n, cfg) {
  let pool = cfg.content === 'chars' ? LV[n].C : cfg.content === 'both' ? LV[n].W.concat(LV[n].C) : LV[n].W;
  if (cfg.scope === 'studied') pool = pool.filter(x => { const s = peekSt(x); return s && s.seen; });
  else if (cfg.scope === 'weak') pool = pool.filter(x => { const s = peekSt(x); return s && s.seen && (s.box <= 2 || s.w > s.c / 3); });
  else if (cfg.scope === 'top') pool = pool.filter(x => x.i <= 300);
  const types = cfg.types && cfg.types.length ? cfg.types : null;
  const xs = shuffle(pool).slice(0, cfg.count || 20);
  startSession('practice', n, `HSK ${n} · Practice`, xs.map(x => { const av = typesFor(x).filter(t => !types || types.includes(t)); return {k: x.key, type: av.length ? pick(av) : anyType(x), first: 1}; }).filter(Boolean));
}
function finalItems(n) {
  const out = activeMist(n), have = new Set(out.map(x => x.key));
  studiedW(n).slice(0, 400).forEach(w => { if (out.length < activeMist(n).length + 60 && !have.has(w.key)) out.push(w); });
  return out;
}
function startFinal(n) {
  startSession('final', n, `HSK ${n} · Final review`, shuffle(finalItems(n)).map(x => ({k: x.key, type: pick(typesFor(x).filter(t => MEANING_ONLY.has(t)).concat(['h2m'])), first: 1})));
}
