/* =====================================================================================
   Mock examinations: per-level configuration, timed run, scoring, history
   Sections follow the HSK paper structure (listening · reading · writing); questions are
   generated only from the selected level's database.
   ===================================================================================== */
const MOCK_SECTIONS = {
  listen: {name: 'Listening', part: '听力', desc: 'Hear a word or sentence, choose the answer', needsVoice: true},
  vocab:  {name: 'Reading · vocabulary', part: '阅读', desc: 'Meaning of a word / choose the word'},
  cloze:  {name: 'Reading · fill in the blank', part: '阅读', desc: '选词填空: choose the word that completes the sentence'},
  tr:     {name: 'Reading · comprehension', part: '阅读', desc: 'Choose what the sentence means'},
  write:  {name: 'Writing · sentence order', part: '书写', desc: '完成句子: put the parts in order'},
  pinyin: {name: 'Writing · pinyin', part: '书写', desc: 'Type the pinyin of the word'}};
function mockDefaults(n) {
  return {minutes: [0, 20, 25, 35, 45, 55, 65][n], scope: 'all',
    counts: {listen: n <= 2 ? 10 : 15, vocab: n <= 2 ? 10 : 12, cloze: n <= 2 ? 8 : 15, tr: n <= 2 ? 6 : 10, write: n >= 3 ? (n >= 5 ? 8 : 6) : 0, pinyin: n <= 3 ? 6 : 0}};
}
const mockCfg = n => { const ls = LS(n); return ls.mockCfg || (ls.mockCfg = mockDefaults(n)); };
function tMock(n) {
  const cfg = mockCfg(n), ls = LS(n), totalQ = Object.entries(cfg.counts).reduce((t, [k, v]) => t + (MOCK_SECTIONS[k].needsVoice && !ZH ? 0 : v), 0);
  let html = `<div class="card"><h2>${IC.doc} HSK ${n} mock exam</h2><div class="small mute">A timed paper in the HSK structure, built only from HSK ${n} content. No feedback until you submit. Pass mark used here: 60%.</div>
    <div class="sp"></div><table class="cfg"><tr><th>Section</th><th>Questions</th></tr>${Object.entries(MOCK_SECTIONS).map(([k, s]) => {
      const off = s.needsVoice && !ZH;
      return `<tr class="${off ? 'mute' : ''}"><td><b>${s.part}</b> ${esc(s.name)}<div class="small mute">${esc(s.desc)}${off ? ' — needs a Chinese voice on this device' : ''}</div></td>
        <td><div class="stepper"><button class="sm" data-a="mcount" data-k="${k}" data-d="-2" ${off ? 'disabled' : ''}>−</button><b>${off ? 0 : cfg.counts[k]}</b><button class="sm" data-a="mcount" data-k="${k}" data-d="2" ${off ? 'disabled' : ''}>+</button></div></td></tr>`; }).join('')}
      <tr><td><b>Time limit</b></td><td><div class="stepper"><button class="sm" data-a="mtime" data-d="-5">−</button><b>${cfg.minutes} min</b><button class="sm" data-a="mtime" data-d="5">+</button></div></td></tr>
      <tr><td><b>Questions drawn from</b></td><td><div class="tabs" style="margin:0">${[['all', 'Whole level'], ['studied', 'Studied only']].map(([k, l]) => `<button class="sm ${cfg.scope === k ? 'on' : ''}" data-a="mscope" data-v="${k}">${l}</button>`).join('')}</div></td></tr></table>
    <div class="sp"></div><div class="row"><button class="pri" data-a="mockstart" ${totalQ ? '' : 'disabled'}>Start mock exam · ${totalQ} questions · ${cfg.minutes} min</button><button class="sm ghost" data-a="mreset">Reset to defaults</button></div></div>`;
  if (ls.mocks.length) {
    html += `<div class="card"><h2>History</h2><div class="chart mocks">${ls.mocks.slice(-12).map(m => `<div class="c" data-tip="${fmtDate(m.d)} · ${m.score}%"><i class="${m.pass ? '' : 'fail'}" style="height:${m.score}%"></i></div>`).join('')}</div>
      <table><tr><th>Date</th><th>Score</th><th>Sections</th><th>Time</th></tr>${ls.mocks.slice().reverse().map(m => `<tr><td>${fmtDate(m.d)}</td><td><b>${m.score}%</b> ${chip(m.pass ? 'pass' : 'below', m.pass ? 'ok' : 'bad')}</td>
        <td class="small">${Object.entries(m.secs).map(([k, [r, t]]) => `${esc(MOCK_SECTIONS[k].name.split(' · ').pop())} ${r}/${t}`).join(' · ')}</td><td class="small">${Math.round(m.dur / 60)} min</td></tr>`).join('')}</table></div>`;
  }
  return html;
}
function weightedPick(pool, k) {
  return pool.map(x => [Math.pow(Math.random(), 1 / (1 / (1 + x.i / 250))), x]).sort((a, b) => b[0] - a[0]).slice(0, k).map(a => a[1]);
}
function startMock(n) {
  const cfg = mockCfg(n), L = LV[n];
  let pool = L.W; if (cfg.scope === 'studied') { const st = studiedW(n); if (st.length >= 20) pool = st; }
  const used = new Set(), items = [];
  const take = (filter, k, typeFn, sec) => {
    const cand = pool.filter(w => !used.has(w.key) && filter(w));
    for (const w of weightedPick(cand, k)) { used.add(w.key); items.push({k: w.key, type: typeFn(w), sec}); }
  };
  for (const sec of ['listen', 'vocab', 'cloze', 'tr', 'write', 'pinyin']) {
    const k = cfg.counts[sec]; if (!k) continue;
    if (sec === 'listen') { if (!ZH) continue; take(w => canPinyin(w), k, w => n >= 3 && w.z && Math.random() < .6 ? 'lsent' : 'listen', sec); }
    if (sec === 'vocab') take(() => true, k, () => pick(['h2m', 'm2h']), sec);
    if (sec === 'cloze') take(w => !!w.z, k, () => 'cloze', sec);
    if (sec === 'tr') take(w => !!w.z, k, () => 'tr', sec);
    if (sec === 'write') take(w => !!w.zt, k, () => 'order', sec);
    if (sec === 'pinyin') take(w => canPinyin(w), k, () => 'type', sec);
  }
  if (!items.length) return toast('Not enough material for a mock exam yet.');
  const qs = items.map(it => Object.assign(gen(it), {sec: it.sec}));
  S.session = {kind: 'mock', level: n, title: `HSK ${n} mock exam`, sid: newSid(), q: items, qs, ans: qs.map(() => null), pos: 0, total: items.length,
    start: Date.now(), end: Date.now() + cfg.minutes * 60000, srsDone: {}, cur: null, right: 0, missed: []};
  save(); go('quiz');
}
function vMock() {
  const ses = S.session, q = ses.qs[ses.pos], x = itemByKey(q.k), left = Math.max(0, ses.end - Date.now());
  const answered = ses.ans.filter(a => a != null && !(Array.isArray(a) && !a.length) && a !== '').length;
  const sec = MOCK_SECTIONS[q.sec];
  return `<header class="top"><h1>${esc(ses.title)}</h1><span class="timer ${left < 300000 ? 'low' : ''}" id="timer">${IC.clock}<b>${fmtLeft(left)}</b></span><button class="sm" data-a="mocksubmit">Submit</button></header>
    <div class="row small mute"><span class="grow"><b style="color:var(--ink)">${sec.part}</b> ${esc(sec.name)} · question ${ses.pos + 1} of ${ses.qs.length}</span><span>${answered} answered</span></div>${bar(answered, ses.qs.length, 'thin')}
    <div class="card">${questionHtml(q, x, false, ses.ans[ses.pos] == null ? (q.mode === 'order' ? [] : q.mode === 'type' ? '' : null) : ses.ans[ses.pos])}
      <div class="row" style="margin-top:14px"><button data-a="mprev" ${ses.pos ? '' : 'disabled'}>← Previous</button><span class="grow"></span><button class="pri" data-a="mnext">${ses.pos < ses.qs.length - 1 ? 'Next →' : 'Review & submit'}</button></div></div>
    <div class="card"><div class="palette">${ses.qs.map((qq, i) => { const a = ses.ans[i], done = a != null && a !== '' && !(Array.isArray(a) && !a.length);
      return `<button class="${i === ses.pos ? 'cur' : ''} ${done ? 'done' : ''}" data-a="mgo" data-i="${i}" title="${esc(MOCK_SECTIONS[qq.sec].name)}">${i + 1}</button>`; }).join('')}</div></div>`;
}
const fmtLeft = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function mockSetAnswer(v) { const ses = S.session; ses.ans[ses.pos] = v; save(); }
function submitMock(auto) {
  const ses = S.session; if (!ses || ses.kind !== 'mock') return;
  const n = ses.level, secs = {}, review = [];
  let right = 0;
  ses.qs.forEach((q, i) => {
    const a = ses.ans[i], x = itemByKey(q.k);
    let ok = false, given = '';
    if (q.mode === 'mc') { ok = a === q.ans; given = a == null ? '(blank)' : q.opts[a]; }
    else if (q.mode === 'order') { const s = (a || []).map(ci => q.chunks[ci]).join('') + q.end; ok = s === q.correct; given = (a || []).length ? s : '(blank)'; }
    else { const r = a ? checkPinyin(a, x) : {res: 'wrong'}; ok = r.res === 'ok'; given = a || '(blank)'; }
    const s = secs[q.sec] || (secs[q.sec] = [0, 0]); s[1]++; if (ok) { s[0]++; right++; }
    record(x, ok, q.type, given, q.correct, ses.sid, `Mock exam`, !ses.srsDone[q.k]); ses.srsDone[q.k] = 1;
    review.push({k: q.k, sec: q.sec, type: q.type, ok, given, correct: q.correct, lab: q.lab, sentence: q.sentence || (q.sent ? q.sent.join('＿＿') : '') || q.big || q.mid || ''});
  });
  const score = Math.round(100 * right / ses.qs.length);
  const result = {d: today(), t: Date.now(), score, pass: score >= 60, secs, dur: Math.round((Math.min(Date.now(), ses.end) - ses.start) / 1000), n: ses.qs.length, auto: !!auto};
  LS(n).mocks.push(result);
  S.session = null; save();
  go('mockresult', {n, result, review});
}
function vMockResult() {
  const {n, result: r, review} = V;
  const wrong = review.filter(x => !x.ok);
  return hdr(`HSK ${n} mock exam · result`, 'backlevel') + `<div class="card" style="text-align:center">${r.auto ? '<div class="small mute">Time ran out — submitted automatically.</div>' : ''}
      ${ring(r.score, 100, r.score + '%')}<div>${chip(r.pass ? 'Pass (60%+)' : 'Below the 60% pass mark', r.pass ? 'ok' : 'bad')}</div><div class="small mute" style="margin-top:6px">${r.n} questions · ${Math.round(r.dur / 60)} minutes</div></div>
    <div class="card"><h2>By section</h2>${Object.entries(r.secs).map(([k, [a, t]]) => `<div class="hbar"><span>${MOCK_SECTIONS[k].part} ${esc(MOCK_SECTIONS[k].name)}</span><div class="minibar wide"><i style="width:${100 * a / t}%"></i><span>${a}/${t}</span></div></div>`).join('')}</div>
    <div class="card"><h2>Review (${wrong.length} wrong)</h2>${review.slice().sort((a, b) => a.ok - b.ok).map(x => { const it = itemByKey(x.k);
      return `<details class="m"><summary><span class="dot ${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✗'}</span><span class="grow small"><span class="mute">${esc(MOCK_SECTIONS[x.sec].name)}</span><br><span class="zh" style="font-size:16px">${esc(x.sentence).slice(0, 60)}</span></span></summary>
        <div class="inner"><div class="small">Your answer: <b>${esc(x.given)}</b><br>Correct: <b class="zh">${esc(x.correct)}</b></div><div class="sp"></div>${it ? itemCard(it) : ''}</div></details>`; }).join('')}</div>
    <div class="row"><button class="pri" data-a="tab" data-t="mock">Back to mock exams</button><button data-a="tab" data-t="review" data-s="mist">See my mistakes</button></div>`;
}
setInterval(() => {
  const ses = S.session;
  if (!ses || ses.kind !== 'mock' || V.name !== 'quiz') return;
  const left = ses.end - Date.now(), t = $('#timer b');
  if (t) { t.textContent = fmtLeft(Math.max(0, left)); $('#timer').classList.toggle('low', left < 300000); }
  if (left <= 0) submitMock(true);
}, 1000);
