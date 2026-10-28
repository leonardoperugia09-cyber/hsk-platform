/* =====================================================================================
   Level dashboard: one view per tab, always scoped to the selected level
   ===================================================================================== */
function vLevel() {
  const n = V.n, tab = V.tab || 'overview';
  const f = {overview: tOverview, chars: tChars, freq: tFreq, vocab: tVocab, cards: tCards, review: tReview, practice: tPractice, mock: tMock, progress: tProgress, exam: tExam}[tab] || tOverview;
  return levelShell(n, tab, f(n));
}
const kpi = (v, l, cls) => `<div class="kpi ${cls || ''}"><b>${v}</b><span>${l}</span></div>`;

/* ---------- overview ---------- */
function tOverview(n) {
  const p = plan(n), st = p.st, [stTxt, stCls] = STATUS_TXT[p.status] || ['', ''], ls = LS(n);
  let html = `<div class="kpis">${kpi(`${st.wSeen}<small> / ${st.words}</small>`, 'Words studied')}${kpi(`${st.cSeen}<small> / ${st.chars}</small>`, 'Characters studied')}
      ${kpi(st.due, 'Reviews due')}${kpi(st.mist, 'Active mistakes')}</div>`;
  const recs = recommendations(n);
  html += `<div class="g12"><section class="span8" aria-labelledby="h-next"><div class="panel-head"><h2 id="h-next">What to do next</h2></div>${recs.length ? recs.map((r, i) => `<button class="rec ${i === 0 ? 'first' : ''}" data-a="rec" data-i="${i}"><span class="ic">${r.icon}</span><span class="grow"><b>${esc(r.t)}</b><span class="small mute zh">${esc(r.s)}</span></span><span aria-hidden="true">→</span></button>`).join('')
    : '<p class="mute">Everything in this level is studied and no reviews are due. Take a mock exam to check yourself.</p>'}</section>
    <aside class="span4"><section class="panel" aria-labelledby="h-exam"><div class="panel-head"><h2 id="h-exam">Exam</h2>${chip(stTxt, stCls)}</div>
      ${ls.examDate ? `<div style="font-size:24px">${p.days >= 0 ? `${p.days} day${p.days === 1 ? '' : 's'}` : 'Passed'}</div><div class="small mute">${fmtDate(ls.examDate)}</div>` : '<p class="small mute" style="margin:0">No exam date set. The app works fine without one.</p>'}
      ${p.days >= 0 && p.paceW != null ? `<p style="margin:12px 0 0">${p.paceW} words + ${p.paceC} characters a day, about ${p.dailyMin} min with reviews.${p.over ? ' <span class="mute">More than is realistic: see Exam prep.</span>' : ''}</p>` : ''}
      <div class="sp"></div><button class="sm" data-a="tab" data-t="exam">${ls.examDate ? 'Preparation plan' : 'Set an exam date'}</button></section>
      <section class="panel" style="margin-top:16px" aria-labelledby="h-mast"><div class="panel-head"><h2 id="h-mast">Mastered</h2><span class="small mute">${st.wMast + st.cMast} / ${st.words + st.chars}</span></div>
      ${bar(st.wMast + st.cMast, st.words + st.chars)}<p class="small mute" style="margin:6px 0 0">Answered right after a gap of a week or more.</p></section></aside></div>`;
  V.recs = recs;
  return html;
}

/* ---------- characters ---------- */
function tChars(n) {
  const sub = V.sub || 'groups';
  let html = `<div class="tabs">${[['groups', 'Study groups'], ['families', 'Families'], ['all', 'All characters']].map(([k, l]) => `<button class="sm ${sub === k ? 'on' : ''}" data-a="sub" data-s="${k}">${l}</button>`).join('')}</div>`;
  if (V.cd) { const c = LV[n].byChar.get(V.cd); if (c) html += `<div class="card hl">${itemCard(c)}<div class="small mute" style="margin-top:6px">HSK-${n} rank #${c.r} · corpus frequency rank ${c.f < 9999 ? '#' + c.f : 'n/a'} · ${c.nw ? 'new at this level' : 'also in a lower level'} · ${STATUS_CHIP[status(c)]}</div></div>`; }
  if (sub === 'groups') {
    const cg = currentCGroup(n);
    html += `<div class="card"><div class="small mute" style="margin-bottom:6px">Groups of ${CGROUP} characters in HSK-${n} frequency order. Learn the cards, then do the exercises; every character is tested twice.</div>`;
    for (let g = 0; g < charGroupCount(n); g++) {
      const st = cgstate(n, g), cs = cgroupChars(n, g);
      html += `<div class="grp ${g === cg ? 'cur' : ''}"><div class="w"><b>Group ${g + 1}</b> ${st.done ? chip(`done · ${st.right}/${st.total}`, 'ok') : st.learned ? chip('learned', 'warn') : chip('new')}
        <span class="zh big">${cs.map(c => `<a href="#" data-a="cdetail" data-c="${esc(c.h)}">${esc(c.h)}</a>`).join('')}</span></div>
        <button class="sm" data-a="clearn" data-g="${g}">Learn</button><button class="sm ${st.done ? '' : 'pri'}" data-a="cex" data-g="${g}">${st.done ? 'Redo' : 'Exercises'}</button></div>`;
      if (g > (cg == null ? 0 : cg) + 6 && !V.allGroups) { html += `<div class="sp"></div><button class="sm" data-a="allgroups">Show all ${charGroupCount(n)} groups</button>`; break; }
    }
    html += `</div>`;
  } else if (sub === 'families') {
    const fam = {};
    const STROKES = new Set('一丨丿丶乙亅乛㇒㇏㇇㇗㇀㇂㇃㇄㇅㇆㇈㇉㇊㇋㇌㇍㇎㇐㇑㇓㇔㇕㇖㇘㇙㇚㇛㇜㇝㇞㇟㇠㇡㇢㇣⺀丷八十冂冖亠勹匚卜厂丄丅');
    for (const c of LV[n].C) for (const k of new Set(c.comp)) if (k !== c.h && /[⺀-鿿]/.test(k) && !STROKES.has(k)) (fam[k] = fam[k] || []).push(c);
    const rows = Object.entries(fam).filter(([, cs]) => cs.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 60);
    html += `<div class="card"><div class="small mute" style="margin-bottom:8px">Characters in HSK ${n} that share a component (radical or phonetic part), largest families first. Learning them together helps you notice the patterns.</div>${rows.map(([k, cs]) => `<div class="fam"><span class="zh fk">${esc(k)}</span><span class="zh big">${cs.slice(0, 24).map(c => `<a href="#" data-a="cdetail" data-c="${esc(c.h)}" class="st-${status(c)}" title="${esc(c.p)} · ${esc(c.e)}">${esc(c.h)}</a>`).join('')}${cs.length > 24 ? `<span class="small mute" style="font-family:inherit;letter-spacing:0"> +${cs.length - 24}</span>` : ''}</span></div>`).join('')}</div>`;
  } else {
    html += `<div class="card"><div class="legend small" style="margin-bottom:8px"><span><i class="sw st-new"></i>new</span><span><i class="sw st-learning"></i>learning</span><span><i class="sw st-mastered"></i>mastered</span><span><i class="sw st-mistake"></i>mistake</span></div>
      <div class="chargrid zh">${LV[n].C.map(c => `<a href="#" data-a="cdetail" data-c="${esc(c.h)}" class="st-${status(c)}" title="#${c.r} ${esc(c.p)} ${esc(c.e)}">${esc(c.h)}</a>`).join('')}</div></div>`;
  }
  return html;
}

/* ---------- frequency ranking ---------- */
function tFreq(n) {
  const L = LV[n], only = V.fnew, q = (V.fq || '').trim();
  let cs = L.C.filter(c => (!only || c.nw) && (!q || c.h === q || c.allp.some(p => stripTone(p).startsWith(stripTone(q.toLowerCase()))) || c.e.toLowerCase().includes(q.toLowerCase())));
  const mx = Math.max(...L.C.map(c => c.n)), shown = cs.slice(0, V.fmore ? 2000 : 100);
  return `<div class="card"><h2>${IC.bars} Character frequency in HSK ${n}</h2><div class="small mute">Ranked by how many HSK ${n} words use the character (60%) and how common it is in general Chinese (40%). Start at the top: these characters unlock the most vocabulary.</div>
    <div class="sp"></div><div class="row"><input class="txt grow" id="fq" data-input="fq" placeholder="Search character, pinyin or meaning" value="${esc(V.fq || '')}" style="font-size:16px"><label class="toggle small"><input type="checkbox" data-change="fnew" ${only ? 'checked' : ''}> only new at this level</label></div></div>
    <div class="card" id="freqlist"><table class="ftable"><tr><th>#</th><th>Char</th><th>Pinyin</th><th>Meaning</th><th>Words in HSK ${n}</th><th class="hide-sm">Corpus rank</th><th>Status</th></tr>
    ${shown.map(c => `<tr data-a="cdetail2" data-c="${esc(c.h)}"><td class="mute">${c.r}</td><td class="zh" style="font-size:24px">${esc(c.h)}</td><td class="py">${esc(c.allp.join(', '))}</td><td class="small">${esc(c.e)}</td>
      <td><div class="minibar" data-tip="${c.n} word${c.n === 1 ? '' : 's'}: ${esc(c.words.slice(0, 8).join('、'))}"><i style="width:${100 * c.n / mx}%"></i><span>${c.n}</span></div></td><td class="hide-sm mute">${c.f < 9999 ? c.f : '–'}</td><td>${STATUS_CHIP[status(c)]}${c.nw ? '' : ' ' + chip('lower level')}</td></tr>`).join('')}</table>
    ${cs.length > shown.length ? `<div class="sp"></div><button class="sm" data-a="fmore">Show all ${cs.length}</button>` : ''}</div>`;
}

/* ---------- vocabulary ---------- */
function tVocab(n) {
  const sub = V.sub || 'batches';
  let html = `<div class="tabs">${[['batches', 'Batches'], ['list', 'Word list']].map(([k, l]) => `<button class="sm ${sub === k ? 'on' : ''}" data-a="sub" data-s="${k}">${l}</button>`).join('')}</div>`;
  if (sub === 'batches') {
    const L = LV[n], cb = currentBatch(n);
    html += `<div class="card"><div class="small mute" style="margin-bottom:8px">${L.W.length} words in ${L.NB} batches of about ${BATCH[n]}, in priority order (${esc(L.meta.ranking)}). Each batch has groups of ${GROUP}: learn the cards, then exercises — every word is tested twice and wrong answers come back until right.</div><div class="days">`;
    for (let d = 1; d <= L.NB; d++) { const dn = batchDone(n, d), ws = batchWords(n, d);
      html += `<button class="${dn ? 'done' : ''} ${d === cb ? 'cur' : ''}" data-a="batch" data-d="${d}">Batch ${d}<br><span class="small">${dn ? 'done' : batchProgress(n, d) + '/' + ws.length}</span><br><span class="small mute">#${ws[0].i}–${ws[ws.length - 1].i}</span></button>`; }
    html += `</div></div>`;
  } else {
    html += `<input class="txt" id="wq" data-input="wq" type="search" placeholder="Search hanzi, pinyin (e.g. baocun) or English" value="${esc(V.q || '')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="sp"></div><div class="tabs">${[['all', 'All'], ['studied', 'Studied'], ['new', 'New'], ['mistake', 'Mistakes'], ['mastered', 'Mastered'], ['starred', 'Starred'], ['due', 'Due']].map(([k, l]) => `<button class="sm ${(V.f || 'all') === k ? 'on' : ''}" data-a="wfilter" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="card wl" id="wlist">${wordListHtml(n)}</div>`;
  }
  return html;
}
function wordMatches(w, q, f) {
  const st = status(w);
  if (f === 'studied' && st === 'new') return false;
  if ((f === 'new' || f === 'mistake' || f === 'mastered') && st !== f) return false;
  if (f === 'starred' && !starred(w)) return false;
  if (f === 'due' && !isDue(w)) return false;
  if (!q) return true;
  if (/[一-鿿]/.test(q)) return w.h.includes(q);
  const ql = q.toLowerCase(), qp = stripTone(ql).replace(/[\s'0-9]/g, '');
  return (qp && w.tl.startsWith(qp)) || w.e.toLowerCase().includes(ql) || w.an.some(a => a.startsWith(ql));
}
function wordListHtml(n) {
  const q = (V.q || '').trim(), f = V.f || 'all', hits = LV[n].W.filter(w => wordMatches(w, q, f)), shown = hits.slice(0, V.more ? 5000 : 120);
  return `<div class="small mute" style="margin-bottom:6px">${hits.length} word${hits.length === 1 ? '' : 's'}${hits.length > shown.length ? ` · showing first ${shown.length}` : ''}</div>` +
    shown.map(w => `<details class="m"><summary><span class="rk">#${w.i}</span><span class="zh h">${esc(w.h)}</span><span class="grow" style="min-width:0"><span class="py" style="font-size:15px">${esc(w.p)}</span> ${STATUS_CHIP[status(w)]}<br><span class="small">${esc(w.e)}</span></span>${starBtn(w)}</summary>
      <div class="inner">${itemCard(w)}<div class="small mute" style="margin-top:6px">Batch ${batchOf(w)}${w.tc ? ` · seen ×${w.tc} in the practice tests` : ''}${peekSt(w) ? ` · your answers: ${peekSt(w).c} right, ${peekSt(w).w} wrong` : ''}</div></div></details>`).join('') +
    (hits.length > shown.length ? `<div class="sp"></div><button class="sm" data-a="wmore">Show all ${hits.length}</button>` : '');
}
function vBatch() {
  const n = V.n, d = V.d, gs = groupsOf(n, d), ws = batchWords(n, d), dp = batchProgress(n, d);
  let html = hdr(`HSK ${n} · Vocabulary batch ${d}`, 'backvocab') + `<div class="card"><div class="row small"><span class="grow">Batch progress · ranks ${ws[0].i}–${ws[ws.length - 1].i}</span><b>${dp} / ${ws.length}</b></div>${bar(dp, ws.length)}`;
  gs.forEach((g, i) => { const st = gstate(n, d, i);
    html += `<div class="grp"><div class="w"><b>Group ${i + 1}</b> ${st.done ? chip(`done · ${st.right}/${st.total} first try`, 'ok') : st.learned ? chip('learned', 'warn') : chip('new')}
      <span class="zh">${g.map(w => esc(w.h)).join(' ')}</span></div>
      <button class="sm" data-a="learn" data-g="${i}">Learn</button><button class="sm ${st.done ? '' : 'pri'}" data-a="ex" data-g="${i}">${st.done ? 'Redo' : 'Exercises'}</button></div>`; });
  html += `</div>`;
  if (batchDone(n, d)) {
    let r = 0, t = 0; const miss = new Set();
    gs.forEach((_, i) => { const s = gstate(n, d, i); r += s.right || 0; t += s.total || 0; (s.missed || []).forEach(k => miss.add(k)); });
    html += `<div class="card"><h2>Batch ${d} summary</h2><div class="score">${t ? Math.round(100 * r / t) : 0}%</div><div class="mute small">${r} of ${t} right first time · ${miss.size} word${miss.size === 1 ? '' : 's'} missed at least once</div>
      ${miss.size ? `<div class="sp"></div><div class="zh" style="font-size:19px;line-height:1.9">${[...miss].map(k => { const x = itemByKey(k); return x ? esc(x.h) : ''; }).join('　')}</div>` : ''}
      <div class="sp"></div><div class="row">${d < LV[n].NB ? `<button class="pri" data-a="batch" data-d="${d + 1}">Next batch →</button>` : ''}<button data-a="tab" data-t="overview">Level overview</button></div></div>`;
  }
  return html;
}

/* ---------- flashcards (self-graded, feeds spaced repetition) ---------- */
const DECKS = [['due', 'Due for review'], ['next', 'Next unlearned words'], ['nextc', 'Next unlearned characters'], ['starred', 'Starred'], ['mistakes', 'My mistakes'], ['studied', 'Everything studied'], ['random', 'Random from the level']];
function deckItems(n, deck) {
  const L = LV[n];
  if (deck === 'due') return dueItems(n);
  if (deck === 'next') return L.W.filter(w => status(w) === 'new').slice(0, 20);
  if (deck === 'nextc') return L.C.filter(c => status(c) === 'new').slice(0, 20);
  if (deck === 'starred') return L.W.concat(L.C).filter(starred);
  if (deck === 'mistakes') return activeMist(n);
  if (deck === 'studied') return shuffle(studiedW(n).concat(studiedC(n)));
  return shuffle(L.W).slice(0, 30);
}
function tCards(n) {
  if (V.fc) return cardRun(n);
  const counts = Object.fromEntries(DECKS.map(([k]) => [k, deckItems(n, k).length]));
  return `<div class="card"><h2>${IC.cards} Flashcards</h2><div class="small mute">Flip each card, then rate yourself honestly. “Again” brings it back tomorrow; “Good” and “Easy” push it further out. Ratings update spaced repetition and mistakes.</div>
    <div class="sp"></div><div class="row"><label class="small mute">Front of card:</label>${[['h', 'Chinese → meaning'], ['e', 'Meaning → Chinese']].map(([k, l]) => `<button class="sm ${(V.front || 'h') === k ? 'on' : ''}" data-a="front" data-f="${k}">${l}</button>`).join('')}</div></div>
    <div class="tiles">${DECKS.map(([k, l]) => `<button class="tile" data-a="deck" data-d="${k}" ${counts[k] ? '' : 'disabled'}><b>${l}</b><span>${counts[k]} card${counts[k] === 1 ? '' : 's'}</span></button>`).join('')}</div>`;
}
function cardRun(n) {
  const fc = V.fc, x = itemByKey(fc.keys[fc.i]);
  if (!x) return `<div class="card"><h2>Deck finished</h2><div class="score">${fc.good} / ${fc.keys.length}</div><div class="mute small">rated Good or Easy</div><div class="sp"></div><button class="pri" data-a="deckend">Back to decks</button></div>`;
  const front = (V.front || 'h') === 'h';
  return `<div class="row small mute"><span class="grow">${fc.i + 1} / ${fc.keys.length}</span><button class="sm ghost" data-a="deckend">End</button></div>${bar(fc.i, fc.keys.length, 'thin')}
    <div class="card flash" data-a="cflip"><div class="corner">${sayBtn(x.h)}${starBtn(x)}</div>
      ${front ? tzg(x.h, 'hz ' + sizeCls(x.h)) : `<div class="en" style="font-size:22px">${esc(x.e)}</div><div class="mute small">${esc(x.pos || '')}</div>`}
      ${fc.flip ? `<div class="sp"></div>${front ? `<div class="py">${esc(x.kind === 'c' ? x.allp.join(', ') : x.p)}</div><div class="en">${esc(x.e)}</div>` : tzg(x.h, 'hz ' + sizeCls(x.h)) + `<div class="py">${esc(x.p)}</div>`}
        ${x.z ? `<div class="ex"><div class="zh">${markWord(x)}</div><div class="p">${esc(x.zp)}</div><div class="t">${esc(x.ze)}</div></div>` : x.kind === 'c' ? `<div class="small mute">in: <span class="zh">${x.words.slice(0, 6).join('、')}</span></div>` : ''}`
      : `<div class="mute" style="margin-top:18px">tap or <span class="kbd">Space</span> to flip</div>`}</div>
    ${fc.flip ? `<div class="grade">${[['again', 'Again', '1'], ['hard', 'Hard', '2'], ['good', 'Good', '3'], ['easy', 'Easy', '4']].map(([k, l, key]) => `<button class="${k}" data-a="grade" data-g="${k}"><b>${l}</b><span class="kbd">${key}</span></button>`).join('')}</div>` : ''}`;
}

/* ---------- review & mistakes ---------- */
function tReview(n) {
  const sub = V.sub || 'due', due = dueItems(n), act = activeMist(n), nStar = LV[n].W.concat(LV[n].C).filter(starred).length;
  let html = `<div class="tabs">${[['due', `Spaced repetition (${due.length} due)`], ['mist', `Mistakes (${act.length})`], ['hist', 'History']].map(([k, l]) => `<button class="sm ${sub === k ? 'on' : ''}" data-a="sub" data-s="${k}">${l}</button>`).join('')}</div>`;
  if (sub === 'due') {
    const dw = due.filter(x => x.kind === 'w').length;
    const next7 = []; const t = dnumToday();
    for (let k = 1; k <= 7; k++) next7.push(LV[n].W.concat(LV[n].C).filter(x => { const s = peekSt(x); return s && s.seen && s.due === t + k; }).length);
    html += `<div class="card"><h2>${IC.repeat} Due today</h2><div class="kpis">${kpi(dw, 'words')}${kpi(due.length - dw, 'characters')}${kpi(sum(next7), 'due in the next 7 days')}${kpi(nStar, 'starred')}</div>
      <div class="small mute" style="margin-top:8px">Each item moves up a box when you get it right (next review after 1, 2, 4, 7, 15, 30, 60 days) and back to box 1 when you miss it.</div>
      <div class="sp"></div><div class="row"><button class="pri" data-a="review" ${studiedW(n).length + studiedC(n).length ? '' : 'disabled'}>${due.length ? `Review ${Math.min(30, due.length)} now` : 'Nothing due — review ahead'}</button>
      <button data-a="pstar" ${nStar ? '' : 'disabled'}>Practise starred</button><button data-a="recall" ${studiedW(n).length ? '' : 'disabled'}>Random recall</button></div></div>`;
  } else if (sub === 'mist') {
    const ls = LS(n), keys = act.sort((a, b) => ls.mist[b.sub].n - ls.mist[a.sub].n);
    html += `<div class="card"><div class="row"><span class="grow small mute">A mistake clears after 3 correct answers on different occasions.</span><button class="sm pri" data-a="pmist" ${keys.length ? '' : 'disabled'}>Practise my mistakes</button></div>`
      + (keys.length ? keys.map(x => { const m = ls.mist[x.sub];
        return `<details class="m"><summary><span class="zh h">${esc(x.h)}</span><span class="grow"><span class="py" style="font-size:16px">${esc(x.p)}</span> ${x.kind === 'c' ? chip('character') : ''}<br><span class="small">${esc(x.e)}</span></span>
          <span style="text-align:right">${chip('missed ×' + m.n, 'bad')}<br><span class="dots" title="correct in a row (3 clears it)">${'●'.repeat(m.streak)}${'○'.repeat(3 - m.streak)}</span></span></summary>
          <div class="inner">${itemCard(x)}<table><tr><th>When</th><th>Exercise</th><th>My answer</th><th>Correct</th></tr>${m.log.slice().reverse().map(l => `<tr><td>${fmtT(l.t)}</td><td>${esc(l.sec || '')}<br><span class="mute">${esc(LAB[l.type] || l.type)}</span></td><td>${esc(l.given)}</td><td>${esc(l.correct)}</td></tr>`).join('')}</table></div></details>`; }).join('')
        : '<div class="mute">No active mistakes. Nice.</div>') + `</div>`;
  } else {
    const ls = LS(n), all = [];
    Object.entries(ls.mist).forEach(([sub2, m]) => m.log.forEach(l => all.push([sub2, l, m.res]))); all.sort((a, b) => b[1].t - a[1].t);
    const cleared = Object.entries(ls.mist).filter(([, m]) => m.res).map(([s]) => itemByKey(n + ':' + s)).filter(Boolean);
    html += `<div class="card"><h2>Cleared (${cleared.length})</h2><div class="zh" style="font-size:19px;line-height:1.9">${cleared.map(x => esc(x.h)).join('　') || '<span class="mute small">None yet.</span>'}</div></div>
      <div class="card"><h2>Every mistake (${all.length})</h2>${all.length ? `<table><tr><th>When</th><th>Item</th><th>Exercise</th><th>My answer</th><th>Correct</th></tr>${all.slice(0, 400).map(([s2, l, res]) => { const x = itemByKey(n + ':' + s2); return x ? `<tr><td>${fmtT(l.t)}</td><td class="zh" style="font-size:18px">${esc(x.h)}${res ? ' ' + chip('cleared', 'ok') : ''}</td><td>${esc(l.sec || '')}<br><span class="mute">${esc(LAB[l.type] || l.type)}</span></td><td>${esc(l.given)}</td><td>${esc(l.correct)}</td></tr>` : ''; }).join('')}</table>` : '<div class="mute">Nothing yet.</div>'}</div>`;
  }
  return html;
}
const fmtT = t => new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Shanghai', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(t));

/* ---------- practice builder ---------- */
const PRACTICE_TYPES = [['h2m', 'Meaning'], ['m2h', 'Choose the word'], ['cloze', 'Fill in the blank'], ['tr', 'Sentence meaning'], ['order', 'Sentence order'], ['h2p', 'Choose pinyin'], ['type', 'Type pinyin'], ['listen', 'Listening (word)'], ['lsent', 'Listening (sentence)'], ['cword', 'Word with character']];
function tPractice(n) {
  const c = V.pc || (V.pc = {content: 'words', scope: 'studied', types: [], count: 20});
  const opt = (field, val, label) => `<button class="sm ${c[field] === val ? 'on' : ''}" data-a="pcset" data-f="${field}" data-v="${val}">${label}</button>`;
  return `<div class="card"><h2>${IC.target} Build a practice set</h2><div class="small mute">Only HSK ${n} content is used.</div>
      <div class="frm"><label>Content</label><div class="tabs">${opt('content', 'words', 'Words')}${opt('content', 'chars', 'Characters')}${opt('content', 'both', 'Both')}</div>
      <label>From</label><div class="tabs">${opt('scope', 'studied', 'What I have studied')}${opt('scope', 'weak', 'My weak items')}${opt('scope', 'top', 'Top 300 by priority')}${opt('scope', 'all', 'Whole level')}</div>
      <label>Exercise types <span class="mute small">(none selected = mixed)</span></label><div class="tabs">${PRACTICE_TYPES.filter(([k]) => ZH || !['listen', 'lsent'].includes(k)).map(([k, l]) => `<button class="sm ${c.types.includes(k) ? 'on' : ''}" data-a="pctype" data-v="${k}">${l}</button>`).join('')}</div>
      <label>Questions</label><div class="tabs">${[10, 20, 40].map(k => `<button class="sm ${c.count === k ? 'on' : ''}" data-a="pcset" data-f="count" data-v="${k}">${k}</button>`).join('')}</div></div>
      <div class="sp"></div><button class="pri" data-a="pcstart">Start practice</button></div>
    <div class="tiles">
      <button class="tile" data-a="recall" ${studiedW(n).length ? '' : 'disabled'}><span class="ic">${IC.keys}</span><b>Random recall</b><span>See a word, type its pinyin and meaning · score ${LS(n).recall.r}/${LS(n).recall.t}</span></button>
      <button class="tile" data-a="final" ${studiedW(n).length || activeMist(n).length ? '' : 'disabled'}><span class="ic">${IC.flag}</span><b>Final review</b><span>Mistakes + highest-priority studied words</span></button></div>`;
}

/* ---------- progress / analytics ---------- */
function tProgress(n) {
  const L = LV[n], st = levelStats(n), ls = LS(n);
  const cnt = arr => { const c = {new: 0, learning: 0, mastered: 0, mistake: 0}; arr.forEach(x => c[status(x)]++); return c; };
  const cw = cnt(L.W), cc = cnt(L.C);
  const stack = (c, total) => `<div class="stack" role="img" aria-label="status">${['mastered', 'learning', 'mistake', 'new'].map(k => c[k] ? `<i class="st-${k}" style="width:${100 * c[k] / total}%" data-tip="${k}: ${c[k]}"></i>` : '').join('')}</div>`;
  const leg = c => `<div class="legend">${[['mastered', 'Mastered'], ['learning', 'Learning'], ['mistake', 'Mistake'], ['new', 'Not studied']].map(([k, l]) => `<span><i class="sw st-${k}"></i>${l} <b style="color:var(--ink)">${c[k]}</b></span>`).join('')}</div>`;
  const days = [], end = dnumToday();
  for (let d = end - 13; d <= end; d++) days.push([isoOf(d), ls.daily[isoOf(d)] || {n: 0, ok: 0}]);
  const maxN = Math.max(10, ...days.map(d => d[1].n));
  let html = `<div class="card"><div class="kpis">${kpi(st.wSeen + st.cSeen, 'items studied')}${kpi(st.wMast + st.cMast, 'mastered')}${kpi(st.acc == null ? '–' : Math.round(st.acc * 100) + '%', 'accuracy')}${kpi(st.mocks, 'mock exams')}</div></div>
    <div class="card"><h2>Vocabulary (${L.W.length})</h2>${stack(cw, L.W.length)}${leg(cw)}<div class="sp"></div><h2>Characters (${L.C.length})</h2>${stack(cc, L.C.length)}${leg(cc)}</div>
    <div class="card"><h2>Answers per day</h2><div class="small mute">Last 14 days · hover a bar for accuracy</div>
      <div class="chart">${days.map(([d, v]) => `<div class="c" data-tip="${fmtDate(d)} · ${v.n} answers${v.n ? ' · ' + Math.round(100 * v.ok / v.n) + '% right' : ''}"><i style="height:${100 * v.n / maxN}%"></i></div>`).join('')}</div>
      <div class="axis">${days.map(([d], i) => `<span>${i % 2 === 0 || i === days.length - 1 ? fmtShort(d) : ''}</span>`).join('')}</div>
      <details style="margin-top:10px"><summary class="small mute" style="cursor:pointer">Show as table</summary><table><tr><th>Date</th><th>Answers</th><th>Right</th></tr>${days.slice().reverse().filter(d => d[1].n).map(([d, v]) => `<tr><td>${fmtDate(d)}</td><td>${v.n}</td><td>${Math.round(100 * v.ok / v.n)}%</td></tr>`).join('') || '<tr><td colspan="3" class="mute">No answers yet</td></tr>'}</table></details></div>`;
  const ta = typeAccuracy(n).filter(x => x.n >= 3);
  if (ta.length) html += `<div class="card"><h2>Accuracy by exercise type</h2><div class="small mute">Weakest first (at least 3 answers)</div>${ta.map(x => `<div class="hbar"><span>${esc(LAB[x.type])}</span><div class="minibar wide" data-tip="${x.n} answers"><i style="width:${x.acc * 100}%"></i><span>${Math.round(x.acc * 100)}%</span></div></div>`).join('')}</div>`;
  if (ls.mocks.length) html += `<div class="card"><h2>Mock exam scores</h2><div class="chart mocks">${ls.mocks.slice(-12).map(m => `<div class="c" data-tip="${fmtDate(m.d)} · ${m.score}% · ${m.pass ? 'pass' : 'below pass mark'}"><i class="${m.pass ? '' : 'fail'}" style="height:${m.score}%"></i></div>`).join('')}</div>
    <div class="axis">${ls.mocks.slice(-12).map(m => `<span>${fmtShort(m.d)}</span>`).join('')}</div><div class="small mute" style="margin-top:6px">Pass mark used here: 60%.</div></div>`;
  const rows = [];
  for (let d = 1; d <= L.NB; d++) { const gs = groupsOf(n, d); let r = 0, t = 0, k = 0; gs.forEach((_, i) => { const s = gstate(n, d, i); if (s.done) { k++; r += s.right; t += s.total; } }); if (k) rows.push(`<tr><td>Batch ${d}</td><td>${k}/${gs.length}</td><td>${Math.round(100 * r / t)}%</td></tr>`); }
  if (rows.length) html += `<div class="card"><h2>Batch scores (first try)</h2><table><tr><th>Batch</th><th>Groups done</th><th>Score</th></tr>${rows.join('')}</table></div>`;
  const weak = L.W.concat(L.C).filter(x => { const s = peekSt(x); return s && s.w; }).sort((a, b) => peekSt(b).w - peekSt(a).w).slice(0, 14);
  if (weak.length) html += `<div class="card"><h2>Most-missed</h2><div class="zh" style="font-size:20px;line-height:2">${weak.map(x => `${esc(x.h)}<sup class="small mute" style="font-family:inherit"> ×${peekSt(x).w}</sup>`).join('　')}</div></div>`;
  return html;
}

/* ---------- exam preparation ---------- */
function tExam(n) {
  const ls = LS(n), p = plan(n), st = p.st, [stTxt, stCls] = STATUS_TXT[p.status] || ['', ''];
  let html = `<div class="card"><h2>${IC.cal} HSK ${n} exam date</h2><div class="row"><input class="txt" type="date" data-change="exam" value="${ls.examDate || ''}" style="max-width:220px">${ls.examDate ? '<button class="sm" data-a="examclear">Remove date</button>' : ''}${chip(stTxt, stCls)}</div>
    <div class="small mute" style="margin-top:6px">The date guides the plan; nothing is locked. Change it any time and everything below is recalculated.</div></div>`;
  html += `<div class="card"><h2>Where you are</h2><div class="kpis">${kpi(p.unW, 'words not yet studied')}${kpi(p.unC, 'characters not yet studied')}${kpi(p.backlog, 'reviews due now')}${kpi(Math.round(p.workloadMin / 60) + ' h', 'estimated remaining work')}</div>
    <div class="small mute" style="margin-top:8px">Estimate: ${MIN_PER.newWord} min per new word, ${MIN_PER.newChar} min per new character, ${MIN_PER.review} min per review.</div></div>`;
  if (ls.examDate && p.days >= 0) {
    html += `<div class="card"><h2>Suggested pace</h2>
      <div class="kpis">${kpi(p.days, 'days left')}${kpi(p.paceW, 'new words / day')}${kpi(p.paceC, 'new characters / day')}${kpi(p.dailyMin + ' min', 'per day incl. reviews')}</div>
      <div class="small mute" style="margin-top:8px">${p.reserve ? `The last ${p.reserve} day${p.reserve > 1 ? 's are' : ' is'} kept free of new material for review and a final mock exam. ` : ''}Progress expected by today: ${Math.round(p.expected * 100)}% · actual: ${Math.round(st.pctSeen * 100)}%.</div>
      ${p.over ? `<div class="fb warn" style="margin-top:10px"><div class="ttl">Covering everything is not realistic in the time left</div><div class="small">At ~150 minutes a day you can cover roughly <b>${Math.min(p.unW, p.capW)} more words</b> and <b>${Math.min(p.unC, p.capC)} characters</b>. Words are already ordered by priority, so follow the batches in order and stop worrying about the tail; spend the rest of the time on reviews and mistakes.</div></div>` : ''}
      ${p.status === 'behind' ? `<div class="fb bad" style="margin-top:10px"><div class="ttl">You are behind the plan</div><div class="small">The daily pace above has already been recalculated from today. Clear due reviews first (they are cheap and protect what you know), then continue with the next batch.</div></div>` : ''}</div>`;
    html += `<div class="card"><h2>${IC.doc} Mock exam schedule</h2>${p.mockDates.map(m => `<div class="grp"><div class="w">${fmtDate(m.d)} ${m.d === today() ? chip('today', 'warn') : ''}</div>${m.done ? chip('done', 'ok') : m.d <= today() ? `<button class="sm pri" data-a="mockstart">Take it now</button>` : chip('planned')}</div>`).join('')}</div>`;
  }
  const recs = recommendations(n); V.recs = recs;
  const pri = [];
  if (st.due) pri.push(`Clear the <b>${st.due}</b> due reviews before learning new material.`);
  if (st.mist) pri.push(`Fix <b>${st.mist}</b> active mistakes — each needs three correct answers on different occasions.`);
  const top = LV[n].W.filter(w => status(w) === 'new').slice(0, 12);
  if (top.length) pri.push(`Highest-priority words you have not studied yet: <span class="zh">${top.map(w => esc(w.h)).join(' ')}</span>`);
  const topc = LV[n].C.filter(c => status(c) === 'new').slice(0, 15);
  if (topc.length) pri.push(`Most useful characters not yet studied: <span class="zh">${topc.map(c => esc(c.h)).join(' ')}</span>`);
  const weak = typeAccuracy(n).filter(x => x.n >= 10 && x.acc < .75).slice(0, 2);
  weak.forEach(x => pri.push(`Weak exercise type: <b>${esc(LAB[x.type])}</b> (${Math.round(x.acc * 100)}% right) — practise it in the Practice tab.`));
  html += `<div class="card"><h2>${IC.target} Revision priorities</h2>${pri.length ? `<ol class="pri-list">${pri.map(x => `<li>${x}</li>`).join('')}</ol>` : '<div class="mute">Nothing urgent.</div>'}
    ${recs.length ? `<div class="sp"></div><button class="pri" data-a="rec" data-i="0">${esc(recs[0].t)} →</button>` : ''}</div>`;
  return html;
}
