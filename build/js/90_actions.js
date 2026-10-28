/* =====================================================================================
   Rendering, actions, keyboard, startup
   ===================================================================================== */
function render() {
  document.documentElement.dataset.theme = S.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const f = {home: vHome, settings: vSettings, level: vLevel, batch: vBatch, learn: vLearn, quiz: vQuiz, result: vResult, recall: vRecall, mockresult: vMockResult}[V.name] || vHome;
  $('#app').className = 'v-' + V.name + (V.name === 'quiz' && S.session && S.session.kind === 'mock' ? ' v-mock' : '');
  $('#app').innerHTML = f();
  const inp = (V.name === 'quiz' && S.session && S.session.kind !== 'mock' && $('#ans')) || (V.name === 'recall' && R && R.phase === 'ask' ? $('#rpy') : null);
  if (inp && !inp.disabled) inp.focus();
  const c = S.session && S.session.cur;
  if (V.name === 'quiz' && c && c.listen && !c.done && !c.spoken) { c.spoken = 1; setTimeout(() => speak(c.listen), 150); }
  if (V.name === 'quiz' && S.session && S.session.kind === 'mock') { const q = S.session.qs[S.session.pos]; if (q.listen && !q.spoken) { q.spoken = 1; setTimeout(() => speak(q.listen), 150); } }
}
const goLevel = (n, tab, extra) => go('level', Object.assign({n: +n, tab: tab || 'overview'}, extra || {}));
function runRec(r, n) {
  if (!r) return;
  if (r.a === 'resume') return go('quiz');
  if (r.a === 'final') return startFinal(n);
  if (r.a === 'review') return startReview(n);
  if (r.a === 'pmist') return startMistakes(n);
  if (r.a === 'batch') return go('batch', {n, d: r.d});
  if (r.a === 'cgroup') return go('learn', {n, kind: 'c', g: r.g, i: 0, rev: false});
  if (r.a === 'practice') return startPractice(n, {content: 'both', scope: 'studied', types: r.types, count: 20});
  if (r.a === 'mock') return startMock(n);
}
function currentItem() {
  if (V.name === 'learn') return learnList()[V.i];
  if (V.name === 'quiz' && S.session && S.session.cur && S.session.cur.done) return itemByKey(S.session.cur.k);
  if (V.name === 'recall' && R && R.phase !== 'ask') return itemByKey(R.k);
  if (V.name === 'level' && V.tab === 'cards' && V.fc && V.fc.flip) return itemByKey(V.fc.keys[V.fc.i]);
  return null;
}
function act(a, el) {
  const d = el && el.dataset || {}, n = V.n, ses = S.session, mock = ses && ses.kind === 'mock' && V.name === 'quiz';
  switch (a) {
    case 'home': return go('home');
    case 'settings': return go('settings');
    case 'theme': S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; save(); return render();
    case 'level': return goLevel(d.n);
    case 'tab': return goLevel(V.n || (V.ses && V.ses.level) || S.lastLevel || 5, d.t, d.s ? {sub: d.s} : {});
    case 'sub': V.sub = d.s; V.cd = null; return render();
    case 'backlevel': return goLevel(V.n || (V.ses && V.ses.level !== 'x' && V.ses.level) || (R && R.n) || S.lastLevel || 5);
    case 'backvocab': return goLevel(n, 'vocab');
    case 'backbatch': return go('batch', {n, d: V.d});
    case 'backchars': return goLevel(n, 'chars');
    case 'quitquiz': { const lv = ses && ses.level; return lv && lv !== 'x' ? goLevel(lv) : go('home'); }
    case 'resume': return go('quiz');
    case 'rec': return runRec((V.recs || [])[+d.i], n);
    case 'review': return startReview(n || (V.ses && V.ses.level));
    case 'xreview': return startCrossReview();
    case 'pmist': return startMistakes(n || (V.ses && V.ses.level));
    case 'pstar': return startStarred(n);
    case 'recall': R = null; return nextRecall(n || (R && R.n));
    case 'final': return startFinal(n);
    case 'mockstart': return startMock(n);
    case 'batch': return go('batch', {n: n || V.ses.level, d: +d.d});
    case 'learn': return go('learn', {n, kind: 'w', d: V.d, g: +d.g, i: 0, rev: false});
    case 'learn2': return go('learn', {n: V.ses.level, kind: 'w', d: +d.d, g: +d.g, i: 0, rev: false});
    case 'ex': return startGroup(n, V.d, +d.g);
    case 'learnex': return V.kind === 'c' ? startCGroup(n, V.g) : startGroup(n, V.d, V.g);
    case 'clearn': return go('learn', {n: n || V.ses.level, kind: 'c', g: +d.g, i: 0, rev: false});
    case 'cex': return startCGroup(n, +d.g);
    case 'cdetail': V.cd = d.c; render(); window.scrollTo(0, 0); return;
    case 'cdetail2': return goLevel(n, 'chars', {sub: 'all', cd: d.c});
    case 'allgroups': V.allGroups = true; return render();
    case 'fmore': V.fmore = true; return render();
    case 'wfilter': V.f = d.f; V.more = false; return render();
    case 'wmore': V.more = true; $('#wlist').innerHTML = wordListHtml(n); return;
    case 'star': { const x = itemByKey(d.k); if (!x) return; const s = istOf(x); if (s.star) delete s.star; else s.star = Date.now(); save();
      $$(`[data-a=star][data-k="${d.k}"]`).forEach(b => b.classList.toggle('on', !!s.star)); return; }
    case 'say': return speak(d.t);
    case 'flip': if (!V.rev) { V.rev = true; render(); if (S.autoSpeak) speak(learnList()[V.i].h); } return;
    case 'expy': V.py = !V.py; return render();
    case 'next': { if (!V.rev) return act('flip'); const len = learnList().length; if (V.i < len - 1) { V.i++; V.rev = false; V.py = false; return render(); } return act('learnex'); }
    case 'prev': if (V.i > 0) { V.i--; V.rev = true; render(); } return;
    /* quiz + mock answering */
    case 'pick': if (mock) { mockSetAnswer(+d.i); return render(); } { const q = ses.cur; if (q.done) return; q.picked = +d.i; return answer(q.picked === q.ans, q.opts[q.picked]); }
    case 'submit': { const q = ses.cur, v = $('#ans').value.trim(); if (q.done || !v) return; const r = checkPinyin(v, itemByKey(q.k)); return answer(r.res === 'ok', v, r.res === 'almost'); }
    case 'opick': if (mock) { const cur = (ses.ans[ses.pos] || []).slice(); if (!cur.includes(+d.i)) cur.push(+d.i); mockSetAnswer(cur); return render(); } { const q = ses.cur; if (q.done || q.picked.includes(+d.i)) return; q.picked.push(+d.i); return render(); }
    case 'unpick': if (mock) { const cur = (ses.ans[ses.pos] || []).slice(); cur.splice(+d.j, 1); mockSetAnswer(cur); return render(); } { const q = ses.cur; if (q.done) return; q.picked.splice(+d.j, 1); return render(); }
    case 'ounpick': { const q = ses.cur; if (q.done || !q.picked.length) return; q.picked.pop(); return render(); }
    case 'osubmit': { const q = ses.cur; if (q.done || q.picked.length !== q.chunks.length) return; const s = q.picked.map(i => q.chunks[i]).join('') + q.end; return answer(s === q.correct, s); }
    case 'qnext': return qnext();
    case 'mprev': if (ses.pos > 0) { ses.pos--; save(); render(); } return;
    case 'mnext': if (ses.pos < ses.qs.length - 1) { ses.pos++; save(); return render(); } return act('mocksubmit');
    case 'mgo': ses.pos = +d.i; save(); return render();
    case 'mocksubmit': { const blank = ses.ans.filter(x => x == null || x === '' || (Array.isArray(x) && !x.length)).length;
      if (confirm(blank ? `${blank} question${blank === 1 ? ' is' : 's are'} unanswered. Submit anyway?` : 'Submit your answers?')) submitMock(false); return; }
    /* recall */
    case 'rsubmit': return recallSubmit();
    case 'rright': return recallJudge(true);
    case 'rwrong': return recallJudge(false);
    case 'rnext': return nextRecall(R.n);
    /* flashcards */
    case 'front': V.front = d.f; return render();
    case 'deck': { const xs = deckItems(n, d.d).slice(0, 40); if (!xs.length) return; V.fc = {keys: xs.map(x => x.key), i: 0, flip: false, good: 0, sid: newSid()}; return render(); }
    case 'cflip': if (!V.fc.flip) { V.fc.flip = true; render(); if (S.autoSpeak) speak(itemByKey(V.fc.keys[V.fc.i]).h); } return;
    case 'grade': { const fc = V.fc, x = itemByKey(fc.keys[fc.i]), g = d.g;
      if (g === 'again') record(x, false, 'card', 'again', x.e, fc.sid, 'Flashcards', true);
      else if (g === 'hard') { record(x, true, 'card', 'hard', x.e, fc.sid, 'Flashcards', false); const s = istOf(x); s.due = dnumToday() + 1; }
      else { record(x, true, 'card', g, x.e, fc.sid, 'Flashcards', true); if (g === 'easy') { const s = istOf(x); s.box = Math.min(7, s.box + 1); s.due = dnumToday() + INTERVAL[s.box]; } fc.good++; }
      fc.i++; fc.flip = false; save(); return render(); }
    case 'deckend': V.fc = null; return render();
    /* practice builder */
    case 'pcset': V.pc[d.f] = d.f === 'count' ? +d.v : d.v; return render();
    case 'pctype': { const t = V.pc.types, i = t.indexOf(d.v); if (i >= 0) t.splice(i, 1); else t.push(d.v); return render(); }
    case 'pcstart': return startPractice(n || V.ses.level, V.pc || {content: 'words', scope: 'studied', types: [], count: 20});
    /* mock config */
    case 'mcount': { const c = mockCfg(n); c.counts[d.k] = Math.max(0, Math.min(40, c.counts[d.k] + +d.d)); save(); return render(); }
    case 'mtime': { const c = mockCfg(n); c.minutes = Math.max(5, Math.min(180, c.minutes + +d.d)); save(); return render(); }
    case 'mscope': mockCfg(n).scope = d.v; save(); return render();
    case 'mreset': LS(n).mockCfg = mockDefaults(n); save(); return render();
    /* exam date */
    case 'examclear': { const ls = LS(n); ls.examDate = null; ls.planBase = null; save(); return render(); }
    /* backup */
    case 'export': {
      const txt = JSON.stringify(S), name = `hsk-progress-${today()}.json`;
      try { const u = URL.createObjectURL(new Blob([txt], {type: 'application/json'})); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); } catch (e) {}
      $('#io').innerHTML = `<div class="sp"></div><div class="small mute">Saved as ${name}. If no download started (some phones), copy this text instead:</div><textarea readonly>${esc(txt)}</textarea>`; return;
    }
    case 'import': $('#io').innerHTML = `<div class="sp"></div><div class="row"><button class="sm" data-a="impfile">Choose a JSON file…</button><span class="small mute">or paste the exported text:</span></div><textarea id="imptxt" placeholder='{"v":2,…}'></textarea><div class="sp"></div><button class="sm pri" data-a="imptxt">Import pasted text</button>`; return;
    case 'impfile': return $('#imp').click();
    case 'imptxt': return doImport($('#imptxt').value);
    case 'reset': if (confirm('Erase ALL progress for all six levels in this browser? Export a backup first if unsure.')) { S = fresh(); save(); go('home'); } return;
  }
}
function doImport(txt) {
  try {
    const o = JSON.parse(txt);
    if (!o || !((o.v === 2 && typeof o.levels === 'object') || (o.v === 1 && typeof o.words === 'object'))) throw 0;
    if (!confirm('Replace the progress in this browser with the imported file?')) return;
    S = migrate(o); delete S.migratedFrom; save(); go('home'); toast('Progress imported.');
  } catch (e) { alert('That is not a valid progress file from this app.'); }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  if (el.tagName === 'A') e.preventDefault();
  if (el.closest('summary') && el.tagName === 'BUTTON') e.preventDefault();
  if (el.closest('.flash') && el.dataset.a !== 'flip' && el.dataset.a !== 'cflip') e.stopPropagation();
  act(el.dataset.a, el);
});
document.addEventListener('input', e => {
  const k = e.target.dataset.input;
  if (k === 'wq') { V.q = e.target.value; V.more = false; $('#wlist').innerHTML = wordListHtml(V.n); }
  else if (k === 'fq') { V.fq = e.target.value; const pos = e.target.selectionStart; render(); const f = $('#fq'); if (f) { f.focus(); f.setSelectionRange(pos, pos); } }
  else if (k === 'mockans') mockSetAnswer(e.target.value);
});
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset.change;
  if (t.id === 'imp' && t.files[0]) { const fr = new FileReader(); fr.onload = () => doImport(fr.result); fr.readAsText(t.files[0]); t.value = ''; }
  else if (k === 'level') goLevel(t.value, V.tab);
  else if (k === 'fnew') { V.fnew = t.checked; render(); }
  else if (k === 'exam') { if (/^\d{4}-\d{2}-\d{2}$/.test(t.value)) { const ls = LS(V.n); ls.examDate = t.value; ls.planBase = {d: dnumToday(), frac: levelStats(V.n).pctSeen}; save(); render(); toast('Plan recalculated for ' + fmtDate(t.value)); } }
  else if (k === 'autosp') { S.autoSpeak = t.checked; save(); }
  else if (k === 'rate') { S.rate = +t.value; save(); speak('你好'); }
});
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName, inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT', k = e.key, ses = S.session;
  if (k === 'Escape') {
    if (V.name === 'home') return;
    e.preventDefault();
    if (V.name === 'level') return go('home');
    if (V.name === 'quiz') return act('quitquiz');
    return act('backlevel');
  }
  if (!inInput && (k === 's' || k === 'S')) { const x = currentItem(); if (x) { e.preventDefault(); act('star', {dataset: {k: x.key}}); } return; }
  if (!inInput && (k === 'l' || k === 'L')) {
    const q = V.name === 'quiz' && ses && (ses.kind === 'mock' ? ses.qs[ses.pos] : ses.cur);
    if (q && q.listen && !q.done) { speak(q.listen); return; }
    const x = currentItem(); if (x) speak(x.h); return;
  }
  if (V.name === 'quiz' && ses && ses.kind === 'mock') {
    const q = ses.qs[ses.pos];
    if (inInput) { if (k === 'Enter') { e.preventDefault(); act('mnext'); } return; }
    if (q.mode === 'mc' && k >= '1' && k <= '4' && +k <= q.opts.length) { e.preventDefault(); act('pick', {dataset: {i: +k - 1}}); }
    else if (k === 'ArrowRight' || k === 'Enter') { e.preventDefault(); act('mnext'); }
    else if (k === 'ArrowLeft') { e.preventDefault(); act('mprev'); }
    else if (k === 'Backspace' && q.mode === 'order') { e.preventDefault(); const cur = (ses.ans[ses.pos] || []).slice(); cur.pop(); mockSetAnswer(cur); render(); }
    return;
  }
  if (V.name === 'quiz' && ses && ses.cur) {
    const q = ses.cur;
    if (q.done) { if (k === 'Enter' || k === ' ') { e.preventDefault(); qnext(); } return; }
    if (q.mode === 'mc' && k >= '1' && k <= '4' && +k <= q.opts.length) { e.preventDefault(); act('pick', {dataset: {i: +k - 1}}); }
    else if (q.mode === 'type' && k === 'Enter') { e.preventDefault(); act('submit'); }
    else if (q.mode === 'order') {
      if (k === 'Backspace') { e.preventDefault(); act('ounpick'); }
      else if (k === 'Enter') { e.preventDefault(); act('osubmit'); }
      else if (k >= '1' && k <= '9') { const free = q.chunks.map((_, i) => i).filter(i => !q.picked.includes(i)); const i = free[+k - 1]; if (i != null) { e.preventDefault(); act('opick', {dataset: {i}}); } }
    }
  } else if (V.name === 'learn') {
    if (k === ' ' || k === 'Enter' || k === 'ArrowRight') { e.preventDefault(); act('next'); }
    else if (k === 'ArrowLeft') { e.preventDefault(); act('prev'); }
    else if ((k === 'p' || k === 'P') && V.rev) act('expy');
  } else if (V.name === 'level' && V.tab === 'cards' && V.fc && V.fc.keys[V.fc.i]) {
    if (!V.fc.flip && (k === ' ' || k === 'Enter')) { e.preventDefault(); act('cflip'); }
    else if (V.fc.flip && k >= '1' && k <= '4') { e.preventDefault(); act('grade', {dataset: {g: ['again', 'hard', 'good', 'easy'][+k - 1]}}); }
  } else if (V.name === 'recall' && R) {
    if (R.phase === 'ask' && k === 'Enter') { e.preventDefault(); if (e.target.id === 'rpy' && !$('#rme').value) $('#rme').focus(); else recallSubmit(); }
    else if (R.phase === 'judge') { if (k === 'y' || k === 'Y') recallJudge(true); else if (k === 'n' || k === 'N' || k === 'Enter') { e.preventDefault(); recallJudge(false); } }
    else if (R.phase === 'fb' && (k === 'Enter' || k === ' ')) { e.preventDefault(); nextRecall(R.n); }
  } else if ((V.name === 'result' || V.name === 'mockresult') && k === 'Enter' && !inInput) { const b = $('#app button.pri'); if (b) { e.preventDefault(); b.click(); } }
});

/* test hooks */
window.__t = {LV, itemByKey, canon, checkPinyin, checkMeaning, pinyinDistractors, distract, gen, typesFor, get S() { return S; }, set S(v) { S = v; }, save, go, record, today, plan, levelStats,
  groupsOf, batchWords, charGroups, reviewItems, dueItems, activeMist, status, startMock, submitMock, migrate, fresh, recommendations, get ZH() { return ZH; }, set ZH(v) { ZH = v; }, get V() { return V; }};

/* startup */
if (S.session && (!S.session.q || !S.session.q.length)) S.session = null;
const migrated = S.migratedFrom; delete S.migratedFrom; save();
render();
if (migrated) toast('Your HSK 5 progress was carried over into the new HSK 5 level.');
