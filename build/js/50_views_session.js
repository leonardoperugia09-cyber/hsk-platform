/* =====================================================================================
   Study sessions: learn cards, quiz, results, random recall
   ===================================================================================== */
function learnList() { return V.kind === 'c' ? cgroupChars(V.n, V.g) : groupsOf(V.n, V.d)[V.g]; }
function vLearn() {
  const xs = learnList(), x = xs[V.i]; markSeen(x); save();
  const rev = V.rev, isC = x.kind === 'c';
  const title = isC ? `HSK ${V.n} · Characters · Group ${V.g + 1}` : `HSK ${V.n} · Batch ${V.d} · Group ${V.g + 1}`;
  return hdr(title + ' · Learn', isC ? 'backchars' : 'backbatch') + bar(V.i + (rev ? 1 : .5), xs.length, 'thin') +
    `<div class="card flash" data-a="flip"><div class="corner">${sayBtn(x.h)}${starBtn(x)}</div>
      <div class="small mute">${V.i + 1} / ${xs.length} · ${isC ? `character rank #${x.r} · in ${x.n} HSK ${V.n} words` : `priority #${x.i}${x.tc ? ` · seen ×${x.tc} in the practice tests` : ''}`}</div>
      ${tzg(x.h, 'hz ' + sizeCls(x.h))}
      ${rev ? (isC
        ? `<div class="py">${esc(x.allp.join(' · '))}</div><div class="en">${esc(x.e)}</div>
           <div class="small mute">Components: <span class="zh" style="font-size:18px;color:var(--ink)">${x.comp.map(esc).join(' + ') || '—'}</span></div>
           <div class="ex"><div class="small mute">HSK ${V.n} words with ${esc(x.h)}</div><div class="zh">${x.words.map(h => { const w = LV[V.n].byHanzi.get(h); return `${esc(h)}${w ? ` <span class="small mute" style="font-family:inherit">${esc(w.p)} — ${esc(w.e.split(';')[0])}</span>` : ''}`; }).slice(0, 6).join('<br>')}</div></div>`
        : `<div class="py">${esc(x.p)}</div><div>${x.pos ? chip(esc(x.pos)) : ''}</div><div class="en">${esc(x.e)}</div>${altHtml(x)}
           ${x.z ? `<div class="ex" data-a="expy"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="grow"><div class="zh">${markWord(x)}</div>${V.py ? `<div class="p">${esc(x.zp)}</div>` : '<div class="p">tap for pinyin</div>'}<div class="t">${esc(x.ze)}</div></div>${sayBtn(x.z, 'Listen to the sentence')}</div></div>` : ''}`)
      : `<div class="mute" style="margin-top:18px">tap or press <span class="kbd">Space</span> to reveal</div>`}
    </div>
    <div class="row"><button data-a="prev" ${V.i ? '' : 'disabled'}>← Prev</button><span class="grow"></span>
      ${V.i < xs.length - 1 ? `<button class="pri" data-a="next">${rev ? 'Next →' : 'Reveal'}</button>` : `<button class="pri" data-a="${rev ? 'learnex' : 'next'}">${rev ? 'Start exercises →' : 'Reveal'}</button>`}</div>
    <div class="small mute" style="margin-top:10px"><span class="kbd">Space</span>/<span class="kbd">→</span> reveal · next &nbsp; <span class="kbd">←</span> back &nbsp; <span class="kbd">P</span> sentence pinyin${ZH ? ' &nbsp; <span class="kbd">L</span> listen' : ''} &nbsp; <span class="kbd">S</span> star</div>`;
}

function vQuiz() {
  const ses = S.session; if (!ses) return vHome();
  if (ses.kind === 'mock') return vMock();
  if (!ses.cur) { ses.cur = gen(ses.q[ses.pos]); save(); }
  const q = ses.cur, x = itemByKey(q.k);
  let html = hdr(esc(ses.title), 'quitquiz') + `<div class="row small mute"><span class="grow">${ses.pos + 1} / ${ses.q.length}${ses.q.length > ses.total ? ` (${ses.q.length - ses.total} repeat${ses.q.length - ses.total === 1 ? '' : 's'})` : ''}${ses.level === 'x' ? ' · HSK ' + x.L : ''}</span><span>${ses.right} right first time</span></div>` + bar(ses.pos + (q.done ? 1 : 0), ses.q.length, 'thin');
  html += `<div class="card">` + questionHtml(q, x, q.done) ;
  if (q.done) {
    const cls = q.ok ? 'ok' : q.almost ? 'warn' : 'bad';
    html += `<div class="fb ${cls}"><div class="ttl">${q.ok ? 'Correct' : q.almost ? 'Almost — right syllables, wrong tones' : 'Not quite'}${!q.ok && q.mode !== 'mc' ? ` · you answered “${esc(q.given)}”` : ''}</div>${q.mode === 'order' && !q.ok ? `<div class="zh" style="font-size:20px">${esc(q.correct)}</div>` : ''}${itemCard(x)}</div>
      <div class="row" style="margin-top:12px"><span class="grow small mute">${!q.ok ? 'This item will come back at the end.' : ''}</span><button class="pri" data-a="qnext">Next <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div>`;
  }
  return html + `</div>`;
}
/* the question body, shared by quizzes and mock exams; feedback colours only when `reveal` */
function questionHtml(q, x, reveal, mockAns) {
  let html = `<div class="q"><div class="lab">${esc(q.lab)}</div>`;
  if (q.big) html += tzg(q.big, 'big ' + sizeCls(q.big));
  if (q.listen) html += `<button class="listen" data-a="say" data-t="${esc(q.listen)}" aria-label="Play again" title="Play again (L)">${IC.sound.replace(/width="20" height="20"/, 'width="40" height="40"')}</button><div class="small mute">tap to replay · <span class="kbd">L</span></div>`;
  if (q.mid) html += `<div class="mid">${esc(q.mid)}</div>${q.sub ? chip(esc(q.sub)) : ''}`;
  if (q.sentence) html += `<div class="sent zh">${esc(q.sentence)}</div>`;
  if (q.sent) html += `<div class="sent zh">${q.sent.map(esc).join(`<span class="blank">${reveal ? esc(x.h) : '　'}</span>`)}</div>`;
  html += `</div>`;
  const picked = mockAns !== undefined ? mockAns : q.picked;
  if (q.mode === 'mc') {
    html += `<div class="opts ${q.zh ? 'two' : ''} ${q.small ? 'smallopts' : ''}">` + q.opts.map((o, i) => `<button class="opt ${q.zh ? 'zhopt zh' : ''} ${reveal ? (i === q.ans ? 'right' : i === picked ? 'wrong' : '') : i === picked ? 'sel' : ''}" data-a="pick" data-i="${i}" ${reveal ? 'disabled' : ''}><span class="n">${i + 1}</span><span>${esc(o)}</span></button>`).join('') + `</div>`;
  } else if (q.mode === 'order') {
    const sel = mockAns !== undefined ? (mockAns || []) : q.picked;
    html += `<div class="small mute" style="text-align:center">${esc(q.hint)}</div><div class="answerline zh">${sel.map((ci, j) => `<button class="chunk" data-a="unpick" data-j="${j}" ${reveal ? 'disabled' : ''}>${esc(q.chunks[ci])}</button>`).join('') || '<span class="mute small" style="font-family:inherit">tap the parts below in order</span>'}<span class="end">${esc(q.end)}</span></div>
      <div class="bank zh">${q.chunks.map((c, i) => sel.includes(i) ? '' : `<button class="chunk" data-a="opick" data-i="${i}" ${reveal ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>
      ${reveal || mockAns !== undefined ? '' : `<div class="row" style="margin-top:10px"><button class="sm" data-a="ounpick" ${sel.length ? '' : 'disabled'}>Undo <span class="kbd">⌫</span></button><span class="grow"></span><button class="pri" data-a="osubmit" ${sel.length === q.chunks.length ? '' : 'disabled'}>Check</button></div>`}`;
  } else {
    const val = mockAns !== undefined ? (mockAns || '') : (q.given || '');
    html += `<div class="row" style="margin-top:14px"><input class="txt grow" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="e.g. ni3hao3 or nǐhǎo" value="${esc(val)}" ${reveal ? 'disabled' : ''} ${mockAns !== undefined ? 'data-input="mockans"' : ''}>${mockAns !== undefined ? '' : `<button class="pri" data-a="submit" ${reveal ? 'disabled' : ''}>Check</button>`}</div>`;
  }
  return html;
}
function answer(ok, given, almost) {
  const ses = S.session, q = ses.cur, item = ses.q[ses.pos], x = itemByKey(q.k);
  q.done = true; q.ok = ok; q.almost = !!almost; q.given = given;
  const first = !ses.srsDone[q.k]; ses.srsDone[q.k] = 1;
  record(x, ok, q.type, given, q.correct, ses.sid, ses.sec, first);
  if (item.first) { if (ok) ses.right++; else if (!ses.missed.includes(q.k)) ses.missed.push(q.k); }
  if (!ok) ses.q.push({k: q.k, type: anyType(x, q.type)});
  save(); render();
  if (S.autoSpeak && !q.listen) speak(x.h);
  if (ok && q.mode === 'mc') { const p = ses.pos; autoTimer = setTimeout(() => { if (V.name === 'quiz' && S.session === ses && ses.pos === p) qnext(); }, S.autoSpeak ? 1100 : 700); }
}
function qnext() {
  clearTimeout(autoTimer);
  const ses = S.session; if (!ses || !ses.cur || !ses.cur.done) return;
  ses.pos++; ses.cur = null;
  if (ses.pos >= ses.q.length) return finish();
  save(); render();
}
function finish() {
  const ses = S.session; S.session = null;
  if (ses.kind === 'group') { const k = ses.d + '-' + ses.g, ls = LS(ses.level); ls.groups[k] = {learned: true, done: true, right: ses.right, total: ses.total, missed: ses.missed, t: Date.now()}; }
  if (ses.kind === 'cgroup') { const ls = LS(ses.level); ls.cgroups[ses.g] = {learned: true, done: true, right: ses.right, total: ses.total, missed: ses.missed, t: Date.now()}; }
  save(); go('result', {ses, n: ses.level === 'x' ? null : ses.level});
}
function vResult() {
  const s = V.ses, pct = s.total ? Math.round(100 * s.right / s.total) : 0, n = s.level;
  let html = hdr(esc(s.title), n === 'x' ? 'home' : 'backlevel') + `<div class="card" style="text-align:center"><div class="mute small">Score</div><div class="score">${s.right} / ${s.total}</div>${bar(s.right, s.total)}<div class="mute small">${pct}% right on the first try${s.q.length > s.total ? ` · ${s.q.length - s.total} repeat question${s.q.length - s.total === 1 ? '' : 's'} until everything was correct` : ''}</div></div>`;
  if (s.missed.length) html += `<div class="card"><h2>Missed (${s.missed.length})</h2><table>${s.missed.map(k => { const x = itemByKey(k); return x ? `<tr><td class="zh" style="font-size:20px">${esc(x.h)}</td><td class="py" style="font-size:15px">${esc(x.p)}</td><td>${esc(x.e)}</td><td style="text-align:right">${starBtn(x)}</td></tr>` : ''; }).join('')}</table></div>`;
  html += `<div class="row">`;
  if (s.kind === 'group') {
    const gs = groupsOf(n, s.d), nx = gs.findIndex((_, i) => !gstate(n, s.d, i).done);
    if (nx >= 0) html += `<button class="pri" data-a="learn2" data-d="${s.d}" data-g="${nx}">Next group →</button>`;
    html += `<button data-a="batch" data-d="${s.d}">${nx >= 0 ? 'Back to batch ' + s.d : 'Batch ' + s.d + ' summary'}</button>`;
  } else if (s.kind === 'cgroup') {
    const nx = currentCGroup(n);
    if (nx != null) html += `<button class="pri" data-a="clearn" data-g="${nx}">Next character group →</button>`;
    html += `<button data-a="tab" data-t="chars">Characters</button>`;
  } else if (s.kind === 'review' && n !== 'x') html += `<button class="pri" data-a="review">Another round</button>`;
  else if (s.kind === 'review') html += `<button class="pri" data-a="xreview">Another round</button>`;
  else if (s.kind === 'mist' && activeMist(n).length) html += `<button class="pri" data-a="pmist">Practise again</button>`;
  else if (s.kind === 'practice') html += `<button class="pri" data-a="pcstart">Another set</button>`;
  return html + `${n !== 'x' ? '<button data-a="tab" data-t="overview">Level overview</button>' : ''}<button data-a="home">All levels</button></div>`;
}

/* ---------------- random recall (type pinyin + meaning) ---------------- */
let R = null;
function nextRecall(n) {
  const st = studiedW(n); if (!st.length) return toast('Study some words first.');
  let w; do { w = pick(st); } while (st.length > 1 && R && w.key === R.k);
  R = {n, k: w.key, phase: 'ask', sid: newSid()}; go('recall', {n});
}
function vRecall() {
  const w = itemByKey(R.k), ls = LS(R.n);
  let html = hdr(`HSK ${R.n} · Random recall`, 'backlevel') + `<div class="row small mute"><span class="grow">Endless mode · studied HSK ${R.n} words only</span><span>Score ${ls.recall.r} / ${ls.recall.t}</span></div>${bar(ls.recall.r, ls.recall.t || 1, 'thin')}
    <div class="card"><div class="q">${tzg(w.h, 'big ' + sizeCls(w.h))}</div>
    <label class="small mute" for="rpy">Pinyin</label><input class="txt" id="rpy" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ni3hao3 / nǐhǎo" value="${esc(R.py || '')}" ${R.phase !== 'ask' ? 'disabled' : ''}>
    <div class="sp"></div><label class="small mute" for="rme">Meaning (English)</label><input class="txt" id="rme" autocomplete="off" autocapitalize="off" placeholder="meaning" value="${esc(R.me || '')}" ${R.phase !== 'ask' ? 'disabled' : ''}>`;
  if (R.phase === 'ask') html += `<div class="sp"></div><div class="row"><span class="grow"></span><button class="pri" data-a="rsubmit">Check <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div>`;
  else {
    const p = R.pr;
    html += `<div class="fb ${p.res === 'ok' ? 'ok' : p.res === 'almost' ? 'warn' : 'bad'}"><div class="ttl">Pinyin: ${p.res === 'ok' ? 'correct' : p.res === 'almost' ? 'almost — syllables right, tones wrong' : 'wrong'}</div><div class="row"><span class="grow">Correct: <b class="py" style="font-size:19px">${esc(p.res === 'almost' ? p.match : w.p)}</b>${p.res === 'ok' && p.match !== w.p ? ` <span class="mute small">(you used the reading ${esc(p.match)})</span>` : ''}</span>${sayBtn(w.h)}${starBtn(w)}</div>${altHtml(w)}</div>
      <div class="fb ${R.mOk ? 'ok' : R.phase === 'judge' ? '' : 'bad'}"><div class="ttl">Meaning: ${R.mOk ? 'correct' : R.phase === 'judge' ? 'not auto-matched — you decide' : 'wrong'}</div><div><b>${esc(w.e)}</b> ${w.pos ? chip(esc(w.pos)) : ''}</div>
      ${w.z ? `<div class="small mute" style="margin-top:6px"><span class="zh" style="font-size:17px;color:var(--ink)">${markWord(w)}</span><br>${esc(w.zp)}<br>${esc(w.ze)}</div>` : ''}</div>`;
    html += R.phase === 'judge'
      ? `<div class="sp"></div><div class="row"><button data-a="rright">I was right <span class="kbd">Y</span></button><button data-a="rwrong">I was wrong <span class="kbd">N</span></button><span class="grow"></span></div>`
      : `<div class="sp"></div><div class="row"><span class="grow"></span><button class="pri" data-a="rnext">Next <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div>`;
  }
  return html + `</div>`;
}
function recallSubmit() {
  const w = itemByKey(R.k); R.py = $('#rpy').value; R.me = $('#rme').value;
  R.pr = checkPinyin(R.py, w);
  record(w, R.pr.res === 'ok', 'rp', R.py || '(blank)', w.p, R.sid, 'Recall', false);
  if (checkMeaning(R.me, w)) { R.mOk = true; recallJudge(true); } else { R.mOk = false; R.phase = 'judge'; save(); render(); }
}
function recallJudge(ok) {
  const w = itemByKey(R.k), ls = LS(R.n); R.mOk = ok; R.phase = 'fb';
  record(w, ok, 'rm', R.me || '(blank)', w.e, R.sid, 'Recall', true);
  if (!(ok && R.pr.res === 'ok')) srsUpdate(w, false);
  ls.recall.t++; if (ok && R.pr.res === 'ok') ls.recall.r++;
  save(); render();
  if (S.autoSpeak) speak(w.h);
}
