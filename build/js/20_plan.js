/* =====================================================================================
   Statistics, exam-date planning and recommendations (always computed from the current state)
   ===================================================================================== */
function levelStats(n) {
  const L = LV[n], r = {words: L.W.length, chars: L.C.length, wSeen: 0, wMast: 0, cSeen: 0, cMast: 0, due: 0, wNew: 0};
  const t = dnumToday();
  for (const w of L.W) { const s = peekSt(w); if (s && s.seen) { r.wSeen++; if (s.box >= 4 && !isMist(w)) r.wMast++; if (s.due <= t) r.due++; } }
  for (const c of L.C) { const s = peekSt(c); if (s && s.seen) { r.cSeen++; if (s.box >= 4 && !isMist(c)) r.cMast++; if (s.due <= t) r.due++; } }
  r.mist = activeMist(n).length;
  r.pctSeen = (r.wSeen + r.cSeen) / (r.words + r.chars);
  r.pctMast = (r.wMast + r.cMast) / (r.words + r.chars);
  const ls = S.levels[n];
  let c = 0, w = 0; if (ls) for (const v of Object.values(ls.types || {})) { c += v.c; w += v.w; }
  r.acc = c + w ? c / (c + w) : null; r.answers = c + w;
  r.mocks = ls ? ls.mocks.length : 0;
  r.lastMock = ls && ls.mocks.length ? ls.mocks[ls.mocks.length - 1] : null;
  return r;
}
const MIN_PER = {newWord: 1.5, newChar: 0.8, review: 0.4};
function plan(n) {
  const ls = LS(n), st = levelStats(n), t = dnumToday();
  const unW = st.words - st.wSeen, unC = st.chars - st.cSeen;
  const learnMin = unW * MIN_PER.newWord + unC * MIN_PER.newChar;
  const p = {st, unW, unC, backlog: st.due, learnMin, reviewMin: st.due * MIN_PER.review, workloadMin: Math.round(learnMin + st.due * MIN_PER.review)};
  if (!ls.examDate) { p.status = st.wSeen + st.cSeen ? 'no-date' : 'not-started'; return p; }
  const D = dnum(ls.examDate) - t; p.days = D;
  if (D < 0) { p.status = 'past'; return p; }
  p.reserve = D > 7 ? 2 : D > 2 ? 1 : 0;                         // last day(s) kept for review and a final mock
  p.studyDays = Math.max(1, D - p.reserve);
  p.paceW = Math.ceil(unW / p.studyDays); p.paceC = Math.ceil(unC / p.studyDays);
  const studied = st.wSeen + st.cSeen;
  const dailyReview = Math.ceil(st.due / Math.min(3, Math.max(1, D)) + studied / 6);  // clear the backlog within ~3 days + steady reviews
  p.dailyReview = dailyReview;
  p.dailyMin = Math.round(p.paceW * MIN_PER.newWord + p.paceC * MIN_PER.newChar + dailyReview * MIN_PER.review);
  const CAP = 150;                                                // minutes/day we consider sustainable
  if (p.dailyMin > CAP) {
    const capNew = Math.max(0, CAP - dailyReview * MIN_PER.review);
    p.capW = Math.floor(capNew * 0.75 / MIN_PER.newWord) * p.studyDays;
    p.capC = Math.floor(capNew * 0.25 / MIN_PER.newChar) * p.studyDays;
    p.over = true;
  }
  // progress against the plan baseline (re-based whenever the date is changed)
  const base = ls.planBase || {d: t, frac: st.pctSeen};
  const span = Math.max(1, dnum(ls.examDate) - base.d), elapsed = Math.min(1, Math.max(0, (t - base.d) / span));
  p.expected = base.frac + (1 - base.frac) * elapsed;
  p.status = D === 0 ? 'exam-day' : st.pctSeen >= .999 ? 'ready' : st.pctSeen + 0.03 >= p.expected ? 'on-track' : 'behind';
  p.mockDates = mockSchedule(n, D);
  return p;
}
function mockSchedule(n, D) {
  const t = dnumToday(), out = new Set();
  if (D >= 21) { for (let k = 0; k < D - 3; k += 7) out.add(t + k); out.add(t + D - 3); out.add(t + D - 1); }
  else if (D >= 7) { for (let k = 0; k < D - 2; k += 4) out.add(t + k); out.add(t + D - 2); }
  else if (D >= 2) { out.add(t); out.add(t + D - 1); }
  else out.add(t);
  const dates = [...out].filter(d => d <= t + D).sort((a, b) => a - b);
  const taken = LS(n).mocks.map(m => dnum(m.d));
  return dates.map((d, i) => ({d: isoOf(d), done: taken.some(x => x >= d && x < (dates[i + 1] || Infinity))}));
}
const STATUS_TXT = {'not-started': ['Not started', ''], 'no-date': ['In progress · no exam date', 'warn'], past: ['Exam date passed', ''], 'exam-day': ['Exam day!', 'bad'],
  ready: ['Everything covered', 'ok'], 'on-track': ['On track', 'ok'], behind: ['Behind plan — plan adapted', 'bad']};
function typeAccuracy(n) {
  const ls = S.levels[n]; if (!ls || !ls.types) return [];
  return Object.entries(ls.types).filter(([k]) => LAB[k]).map(([k, v]) => ({type: k, n: v.c + v.w, acc: v.c / Math.max(1, v.c + v.w)})).sort((a, b) => a.acc - b.acc);
}
/* recommended next actions, most important first */
function recommendations(n) {
  const p = plan(n), st = p.st, out = [];
  if (S.session && S.session.level === n) out.push({a: 'resume', t: `Finish “${S.session.title}”`, s: `question ${S.session.pos + 1} of ${S.session.q.length}`, icon: IC.repeat});
  if (p.status === 'exam-day') out.push({a: 'final', t: 'Final review', s: `${st.mist} mistakes + top studied words`, icon: IC.flag});
  if (st.due) out.push({a: 'review', t: `Review ${st.due} due item${st.due === 1 ? '' : 's'}`, s: 'spaced repetition — keeps what you learned', icon: IC.repeat});
  if (st.mist >= 5) out.push({a: 'pmist', t: `Fix ${st.mist} mistakes`, s: 'each needs 3 correct answers on different occasions', icon: IC.alert});
  const cb = currentBatch(n);
  if (cb) { const ws = batchWords(n, cb); out.push({a: 'batch', d: cb, t: `Learn vocabulary batch ${cb}`, s: `ranks ${ws[0].i}–${ws[ws.length - 1].i} · ${batchProgress(n, cb)}/${ws.length} done`, icon: IC.book}); }
  const cg = currentCGroup(n);
  if (cg != null) out.push({a: 'cgroup', g: cg, t: `Learn character group ${cg + 1}`, s: cgroupChars(n, cg).map(c => c.h).join(' '), icon: IC.grid});
  const weak = typeAccuracy(n).find(x => x.n >= 10 && x.acc < .7);
  if (weak) out.push({a: 'practice', types: [weak.type], t: `Practise “${LAB[weak.type]}”`, s: `your weakest exercise type (${Math.round(weak.acc * 100)}% right)`, icon: IC.target});
  if (p.mockDates && p.mockDates.some(m => m.d <= today() && !m.done) && st.pctSeen > .15) out.push({a: 'mock', t: 'Take a mock exam', s: 'scheduled in your preparation plan', icon: IC.doc});
  else if (!p.mockDates && st.pctSeen > .3 && (!st.lastMock || dnumToday() - dnum(st.lastMock.d) >= 7)) out.push({a: 'mock', t: 'Take a mock exam', s: 'check where you stand', icon: IC.doc});
  return out;
}
