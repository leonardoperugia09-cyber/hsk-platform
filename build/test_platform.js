// End-to-end checks for the HSK 1–6 platform. Wipes progress first. Run in the page.
(async () => {
  const t = window.__t, out = [], q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const click = s => { const e = typeof s === 'string' ? q(s) : s; if (!e) throw new Error('missing ' + s); e.click(); };
  const ok = (name, cond, extra) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' — ' + extra : ''));
  window.confirm = () => true; window.alert = m => out.push('ALERT ' + m);
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  localStorage.removeItem('hsk5app.v1.debugDate');
  t.S = t.fresh(); t.save(); t.go('home');
  const LEVELS = [1, 2, 3, 4, 5, 6];

  // ---- data integrity per level
  for (const n of LEVELS) {
    const L = t.LV[n], keys = new Set();
    let dup = 0, bad = 0, noEx = 0;
    for (const w of L.W) { if (keys.has(w.h)) dup++; keys.add(w.h); if (!w.p || !w.e || !w.an.length) bad++; if (!w.z) noEx++; if (w.L !== n) bad++; }
    ok(`HSK ${n} database: ${L.W.length} words, ${L.C.length} chars`, !dup && !bad, `dup ${dup}, bad ${bad}, missing examples ${noEx}`);
  }
  // ---- every question type for every item generates a valid question (from the same level only)
  let gen = 0; const gf = [];
  for (const n of LEVELS) for (const x of t.LV[n].W.concat(t.LV[n].C)) for (const type of t.typesFor(x)) {
    const qq = t.gen({k: x.key, type}); gen++;
    if (qq.mode === 'mc') {
      if (qq.opts.length !== 4 || new Set(qq.opts).size !== 4 || qq.ans < 0) gf.push(`${n} ${type} ${x.h} ${JSON.stringify(qq.opts)}`);
      if (['m2h', 'cloze', 'listen'].includes(qq.type)) { const pool = x.kind === 'c' ? t.LV[n].C : t.LV[n].W; if (!qq.opts.every(o => pool.some(y => y.h === o))) gf.push('cross-level option ' + x.h); }
    }
    if (qq.mode === 'order' && (qq.chunks.slice().sort().join('') !== x.zt.c.slice().sort().join('') || x.zt.c.join('') + x.zt.end !== x.z)) gf.push('order ' + x.h);
    if (qq.mode === 'type' && t.checkPinyin(x.p, x).res !== 'ok') gf.push('self-pinyin ' + x.h);
  }
  ok('question generation for all items × types', gf.length === 0, `${gen} generated; ${gf.slice(0, 5).join(' | ')}`);

  // ---- every tab renders for every level
  const tabs = ['overview', 'chars', 'freq', 'vocab', 'cards', 'review', 'practice', 'mock', 'progress', 'exam'];
  let rendered = 0;
  for (const n of LEVELS) for (const tab of tabs) { t.go('level', {n, tab}); if (q('nav.tabbar button.on')) rendered++; }
  for (const sub of ['groups', 'families', 'all']) { t.go('level', {n: 3, tab: 'chars', sub}); }
  t.go('level', {n: 3, tab: 'vocab', sub: 'list'}); t.go('level', {n: 3, tab: 'review', sub: 'mist'}); t.go('level', {n: 3, tab: 'review', sub: 'hist'});
  ok('all 60 level tabs render', rendered === 60 && !errs.length, errs.join('; '));

  // ---- vocabulary group in HSK 3: isolation, 2 questions per word, re-queue
  t.go('batch', {n: 3, d: 1}); click('[data-a=learn][data-g="0"]');
  for (let i = 0; i < 40; i++) { const nx = q('[data-a=next]') || q('[data-a=learnex]'); if (!nx) break; if (nx.dataset.a === 'learnex' && q('.flash .py')) { break; } nx.click(); }
  click('[data-a=learnex]');
  let ses = t.S.session;
  ok('HSK 3 group: 40 questions, only HSK 3 items', ses.q.length === 40 && ses.q.every(x => x.k.startsWith('3:')), [...new Set(ses.q.map(x => x.type))].join(','));
  function answerCur(right) {
    const c = t.S.session.cur, x = t.itemByKey(c.k);
    if (c.mode === 'mc') click(qa('[data-a=pick]')[right ? c.ans : (c.ans + 1) % 4]);
    else if (c.mode === 'order') { const order = right ? x.zt.c.map(ch => c.chunks.indexOf(ch)) : c.chunks.map((_, i) => i).reverse(); order.forEach(i => click(`[data-a=opick][data-i="${i}"]`)); click('[data-a=osubmit]'); }
    else { q('#ans').value = right ? x.p : 'zzz1'; click('[data-a=submit]'); }
    if (!t.S.session.cur.done) throw new Error('not answered ' + c.type);
    click('[data-a=qnext]');
  }
  const run = wrongFirst => { let k = 0, g = 0; while (t.S.session && t.S.session.kind !== 'mock' && g++ < 600) answerCur(k++ >= wrongFirst); return k; };
  const asked = run(3);
  const g0 = t.S.levels[3].groups['1-0'];
  ok('group finished with re-queue + score', asked >= 43 && g0.done && g0.right === 37 && g0.total === 40, `${asked} asked, ${g0.right}/${g0.total}`);
  ok('mistakes logged in HSK 3 only', t.activeMist(3).length >= 1 && [1,2,4,5,6].every(k => !t.S.levels[k] || !Object.keys(t.S.levels[k].mist).length), t.activeMist(3).length);
  const w1 = t.LV[3].W[0], st1 = t.S.levels[3].items[w1.sub];
  ok('SRS scheduled after learning', st1 && st1.seen && st1.box >= 1 && st1.due > 0, JSON.stringify(st1));

  // ---- character group in HSK 1
  t.go('level', {n: 1, tab: 'chars'}); click('[data-a=cex][data-g="0"]');
  ses = t.S.session;
  ok('HSK 1 character group: 20 questions, characters only', ses.q.length === 20 && ses.q.every(x => x.k.startsWith('1:c:')), [...new Set(ses.q.map(x => x.type))].join(','));
  run(0); ok('character group done', t.S.levels[1].cgroups[0] && t.S.levels[1].cgroups[0].done);

  // ---- review (spaced repetition) using a simulated later date
  localStorage.setItem('hsk5app.v1.debugDate', t.today().slice(0, 8) + String(+t.today().slice(8) + 2).padStart(2, '0'));
  ok('items become due', t.dueItems(3).length >= 20, t.dueItems(3).length);
  t.go('level', {n: 3, tab: 'review'}); click('[data-a=review]');
  ok('review session = HSK 3 due items only', t.S.session.q.every(x => x.k.startsWith('3:')) && t.S.session.q.length >= 20, t.S.session.q.length);
  run(0);
  ok('reviewed items move up a box', t.LV[3].W.slice(0, 20).some(w => t.S.levels[3].items[w.sub].box >= 3));
  localStorage.removeItem('hsk5app.v1.debugDate');

  // ---- mistakes clear after 3 occasions
  for (let r = 0; r < 3; r++) { if (!t.activeMist(3).length) break; t.go('level', {n: 3, tab: 'review', sub: 'mist'}); click('[data-a=pmist]'); run(0); }
  ok('mistakes cleared after 3 correct occasions', t.activeMist(3).length === 0);

  // ---- flashcards
  t.go('level', {n: 2, tab: 'cards'}); click('[data-a=deck][data-d=next]');
  for (let i = 0; i < 5; i++) { click('[data-a=cflip]'); click(`[data-a=grade][data-g=${i === 0 ? 'again' : 'good'}]`); }
  const s2 = t.S.levels[2].items;
  ok('flashcard grades feed SRS + mistakes', Object.keys(s2).length === 5 && t.activeMist(2).length === 1, Object.values(s2).map(s => s.box).join(','));

  // ---- practice builder (types filter, level only)
  t.go('level', {n: 2, tab: 'practice'}); click('[data-a=pcset][data-f=scope][data-v=all]'); click('[data-a=pctype][data-v=cloze]'); click('[data-a=pcstart]');
  ok('practice: only cloze, only HSK 2', t.S.session.q.every(x => x.type === 'cloze' && x.k.startsWith('2:')) && t.S.session.q.length === 20);
  run(0);

  // ---- recall
  t.go('level', {n: 3, tab: 'practice'}); click('[data-a=recall]');
  let w = t.itemByKey(t.V.name === 'recall' ? window.__t.S && [...document.querySelectorAll('.q .tzg')].map(e => e.textContent).join('') : '');
  w = t.LV[3].W.find(x => x.h === [...document.querySelectorAll('.q .tzg')].map(e => e.textContent).join(''));
  q('#rpy').value = w.p; q('#rme').value = w.a[0]; click('[data-a=rsubmit]');
  ok('recall auto-grades HSK 3 word', t.S.levels[3].recall.r === 1 && !!q('[data-a=rnext]'));

  // ---- mock exam
  t.go('level', {n: 4, tab: 'mock'}); click('[data-a=mockstart]');
  ses = t.S.session;
  ok('HSK 4 mock: sections + only HSK 4', ses.kind === 'mock' && ses.qs.every(x => x.k.startsWith('4:')) && new Set(ses.qs.map(x => x.sec)).size >= 4, ses.qs.length + ' q, ' + [...new Set(ses.qs.map(x => x.sec))].join(','));
  ses.qs.forEach((qq, i) => { const x = t.itemByKey(qq.k); ses.ans[i] = qq.mode === 'mc' ? qq.ans : qq.mode === 'order' ? x.zt.c.map(ch => qq.chunks.indexOf(ch)) : x.p; });
  ses.ans[0] = qq0wrong(ses.qs[0]);
  function qq0wrong(qq) { return qq.mode === 'mc' ? (qq.ans + 1) % 4 : qq.mode === 'order' ? [] : 'zzz'; }
  t.go('quiz'); click('[data-a=mocksubmit]');
  const m = t.S.levels[4].mocks[0];
  ok('mock scored + saved', m && m.n === ses.qs.length && m.score === Math.round(100 * (m.n - 1) / m.n) && t.V.name === 'mockresult', m && m.score + '%');
  t.go('level', {n: 4, tab: 'mock'}); click('[data-a=mockstart]'); t.S.session.end = Date.now() - 1000;
  await new Promise(r => setTimeout(r, 1300));
  ok('mock auto-submits when time runs out', t.S.levels[4].mocks.length === 2 && t.S.levels[4].mocks[1].auto);

  // ---- exam date planning
  t.go('level', {n: 5, tab: 'exam'});
  const di = q('input[type=date]'); const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10); di.value = future; di.dispatchEvent(new Event('change', {bubbles: true}));
  let p = t.plan(5);
  ok('HSK 5 plan from date', t.S.levels[5].examDate === future && p.days >= 29 && p.paceW > 0 && p.mockDates.length >= 4 && ['on-track', 'behind'].includes(p.status), `${p.days} days, ${p.paceW} w/day, ${p.dailyMin} min, ${p.status}, mocks ${p.mockDates.length}`);
  const near = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10); const di2 = q('input[type=date]'); di2.value = near; di2.dispatchEvent(new Event('change', {bubbles: true})); di.value = near; di.dispatchEvent(new Event('change', {bubbles: true}));
  p = t.plan(5);
  ok('changing the date recalculates; unrealistic plan is flagged', p.days <= 5 && p.over === true && p.capW > 0, `${p.paceW} w/day → cap ${p.capW}`);
  localStorage.setItem('hsk5app.v1.debugDate', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  ok('falling behind is detected', t.plan(5).status === 'behind');
  localStorage.setItem('hsk5app.v1.debugDate', near);
  t.go('home'); ok('exam day status + final review recommended', t.plan(5).status === 'exam-day' && t.recommendations(5)[0].a === 'final');
  localStorage.removeItem('hsk5app.v1.debugDate');
  t.go('level', {n: 1, tab: 'overview'}); ok('level without a date works', t.plan(1).status !== 'past' && !!q('.rec'));
  const recs = t.recommendations(3); click('[data-a=rec][data-i="0"]');
  ok('recommendation buttons act', t.V.name === 'quiz' || t.V.name === 'batch' || t.V.name === 'learn', recs[0] && recs[0].a + ' → ' + t.V.name);
  t.S.session = null;

  // ---- cross-level review mixes levels; level sessions never do
  t.go('home'); click('[data-a=xreview]');
  const lvls = new Set(t.S.session.q.map(x => x.k[0]));
  ok('cross-level review mixes levels (explicit only)', t.S.session.level === 'x' && lvls.size >= 2, [...lvls].join(','));
  t.S.session = null;

  // ---- export / import round trip
  t.go('settings'); click('[data-a=export]'); const exported = q('#io textarea').value;
  click('[data-a=reset]'); ok('reset clears', !t.S.levels[3] || !Object.keys(t.S.levels[3].groups).length);
  t.go('settings'); click('[data-a=import]'); q('#imptxt').value = exported; click('[data-a=imptxt]');
  ok('import restores all levels', t.S.levels[3].groups['1-0'].done && t.S.levels[4].mocks.length === 2);
  ok('no JS errors', !errs.length, errs.join('; '));
  t.S = t.fresh(); t.save(); t.go('home');
  return out.join('\n');
})().catch(e => 'ERROR ' + e.message + '\n' + e.stack)
