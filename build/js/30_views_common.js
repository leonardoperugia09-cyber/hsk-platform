/* =====================================================================================
   Shared view pieces, home page (six levels), settings
   ===================================================================================== */
let V = {name: 'home'}, autoTimer = null;
function go(name, p) { clearTimeout(autoTimer); hideTip(); V = Object.assign({name}, p || {}); if (V.n) S.lastLevel = V.n; render(); window.scrollTo(0, 0); }
function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.className = 'show'; clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2600); }
const bar = (a, b, cls) => `<div class="bar ${cls || ''}"><i style="width:${b ? Math.min(100, 100 * a / b) : 0}%"></i></div>`;
const chip = (t, cls) => `<span class="chip ${cls || ''}">${t}</span>`;
const sayBtn = (t, title) => ZH ? `<button class="icon" data-a="say" data-t="${esc(t)}" title="${title || 'Listen'} (L)" aria-label="${title || 'Listen'}">${IC.sound}</button>` : '';
const starBtn = x => x ? `<button class="icon star ${starred(x) ? 'on' : ''}" data-a="star" data-k="${x.key}" title="Mark as hard (S)" aria-label="Star">${IC.star}</button>` : '';
const tzg = (h, cls) => `<div class="tzgs zh ${cls || ''}">${[...h].map(c => `<span class="tzg"><span>${esc(c)}</span></span>`).join('')}</div>`;
const sizeCls = h => h.length >= 4 ? 'xl' : h.length === 3 ? 'long' : '';
const altHtml = w => (w.alt && w.alt.length && w.kind === 'w') ? `<div class="alt">Also read ${w.alt.map(a => `<b>${esc(a[0])}</b> ${esc(a[1])}`).join(' · ')}</div>` : (w.kind === 'c' && w.allp.length > 1 ? `<div class="alt">Readings in HSK ${w.L}: ${w.allp.map(p => `<b>${esc(p)}</b>`).join(' · ')}</div>` : '');
const markWord = w => esc(w.z).split(esc(w.h)).join(`<b>${esc(w.h)}</b>`);
const STATUS_CHIP = {new: chip('new'), learning: chip('learning', 'warn'), mastered: chip('mastered', 'ok'), mistake: chip('mistake', 'bad')};
function itemCard(x) {
  if (x.kind === 'c') return `<div class="wc"><div class="grow"><span class="zh" style="font-size:30px">${esc(x.h)}</span> <span class="py" style="font-size:17px">${esc(x.allp.join(', '))}</span> ${chip('character')}
      <div>${esc(x.e)}</div><div class="small mute">Components: <span class="zh">${x.comp.map(esc).join(' + ') || '—'}</span> · in ${x.n} HSK ${x.L} word${x.n === 1 ? '' : 's'}: <span class="zh">${x.words.slice(0, 6).map(esc).join('、')}</span></div></div>
      <div class="row" style="flex-direction:column;gap:6px">${sayBtn(x.h)}${starBtn(x)}</div></div>`;
  return `<div class="wc"><div class="grow"><span class="zh" style="font-size:26px">${esc(x.h)}</span> <span class="py" style="font-size:17px">${esc(x.p)}</span> ${x.pos ? chip(esc(x.pos)) : ''}
    <div>${esc(x.e)}</div>${altHtml(x)}${x.z ? `<div class="small mute" style="margin-top:6px"><span class="zh" style="font-size:17px;color:var(--ink)">${markWord(x)}</span><br>${esc(x.zp)}<br>${esc(x.ze)}</div>` : ''}</div>
    <div class="row" style="flex-direction:column;gap:6px">${sayBtn(x.h)}${x.z ? sayBtn(x.z, 'Listen to the sentence').replace(' (L)', '') : ''}${starBtn(x)}</div></div>`;
}
function ring(a, b, label, size) {
  const r = 44, c = 2 * Math.PI * r, f = b ? a / b : 0;
  return `<div class="ring ${size || ''}"><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="9"/>
    ${f > 0 ? '' : '<!--'}<circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--ring)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/>${f > 0 ? '' : '-->'}</svg>
    <div class="lbl"><b>${label != null ? label : Math.round(f * 100) + '%'}</b></div></div>`;
}
const themeBtn = () => `<button class="icon" data-a="theme" title="Light / dark" aria-label="Toggle dark mode">${IC.moon}</button>`;
function hdr(title, back, extra) {
  return `<header class="top">${back ? `<button class="icon" data-a="${back}" aria-label="Back">←</button>` : `<button class="icon" data-a="home" aria-label="Home">${IC.home}</button>`}<h1>${title}</h1>${extra || ''}${themeBtn()}</header>`;
}
const TABS = [['overview', 'Overview', IC.home], ['chars', 'Characters', IC.grid], ['freq', 'Frequency', IC.bars], ['vocab', 'Vocabulary', IC.book], ['cards', 'Flashcards', IC.cards],
  ['review', 'Review', IC.repeat], ['practice', 'Practice', IC.target], ['mock', 'Mock exams', IC.doc], ['progress', 'Progress', IC.chart], ['exam', 'Exam prep', IC.cal]];
const brandmark = () => `<a href="#" class="brandmark" data-a="home"><img src="${LOGO}" alt="">HSK Platform</a>`;
/* level screens: a labelled sidebar on desktop; below 1100px a slim bar and a sideways-scrolling section row */
function levelShell(n, tab, body) {
  const sel = cls => `<select class="lvsel ${cls || ''}" data-change="level" aria-label="Switch level">${LEVELS.map(k => `<option value="${k}" ${k === n ? 'selected' : ''}>HSK ${k}</option>`).join('')}</select>`;
  const navBtns = TABS.map(([k, l, ic]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-t="${k}" ${tab === k ? 'aria-current="page"' : ''}>${ic}<span>${l}</span></button>`).join('');
  const label = (TABS.find(t => t[0] === tab) || TABS[0])[1];
  const st = plan(n), exam = LS(n).examDate;
  const sub = [esc(LV[n].meta.syllabus), `${LV[n].W.length} words · ${LV[n].C.length} characters`, exam ? `exam ${fmtShort(exam)}${st.days >= 0 ? ` · ${st.days} day${st.days === 1 ? '' : 's'} left` : ''}` : ''].filter(Boolean).join(' · ');
  return `<div class="shell"><aside class="side">${brandmark()}${sel()}<div class="navlabel">HSK ${n}</div><nav aria-label="Level sections">${navBtns}</nav>
      <div class="foot"><button class="icon" data-a="settings" title="Settings" aria-label="Settings">${IC.gear}</button>${themeBtn()}</div></aside>
    <main class="canvas"><div class="mbar">${brandmark()}${sel()}${themeBtn()}</div>
      <nav class="tabbar" aria-label="Level sections">${navBtns}</nav>
      <div class="titlerow"><div class="grow"><h1>HSK ${n} · ${label}</h1><div class="sub">${sub}</div></div></div>${body}</main></div>`;
}

/* ---------------- tooltip (charts) ---------------- */
function hideTip() { const t = $('#tip'); if (t) t.hidden = true; }
document.addEventListener('pointerover', e => {
  const c = e.target.closest && e.target.closest('[data-tip]'), t = $('#tip'); if (!t) return;
  if (!c) { t.hidden = true; return; }
  t.textContent = c.dataset.tip; t.hidden = false;
  const r = c.getBoundingClientRect(), tw = t.offsetWidth;
  t.style.left = Math.max(8, Math.min(innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
  t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + 'px';
});

/* ---------------- home ---------------- */
function studyStreak() {
  const days = new Set(); for (const n of LEVELS) { const ls = S.levels[n]; if (ls) Object.keys(ls.daily).forEach(d => days.add(d)); }
  let k = 0, d = dnumToday(); if (!days.has(isoOf(d))) d--;
  while (days.has(isoOf(d))) { k++; d--; }
  return k;
}
function vHome() {
  const td = LEVELS.reduce((a, n) => { const d = S.levels[n] && S.levels[n].daily[today()]; if (d) { a.n += d.n; a.ok += d.ok; } return a; }, {n: 0, ok: 0});
  const totalDue = LEVELS.reduce((t, n) => t + (S.levels[n] ? levelStats(n).due : 0), 0);
  const plans = Object.fromEntries(LEVELS.map(n => [n, plan(n)]));
  // the greeting states today's one fact: the nearest exam, or the reviews waiting
  const upcoming = LEVELS.filter(n => plans[n].days >= 0).sort((a, b) => plans[a].days - plans[b].days);
  const nx = upcoming[0];
  const greeting = nx != null ? (plans[nx].days === 0 ? `HSK ${nx} is today.` : `${plans[nx].days} day${plans[nx].days === 1 ? '' : 's'} to HSK ${nx}.`)
    : totalDue ? `${totalDue} review${totalDue === 1 ? '' : 's'} waiting.` : 'Pick a level and start.';
  const dateLine = new Intl.DateTimeFormat('en-GB', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Shanghai'}).format(new Date())
    + (nx != null ? ` · HSK ${nx}: ${plans[nx].st.wSeen} of ${plans[nx].st.words} words studied` : '');
  let html = `<header class="shellbar">${brandmark()}<button class="icon" data-a="settings" title="Settings" aria-label="Settings">${IC.gear}</button>${themeBtn()}</header>
    <section class="greetband"><h1 class="greet">${greeting}</h1><p class="greet-sub">${dateLine}</p></section>
    <div class="kpis">${[[studyStreak(), 'Day streak'], [td.n, 'Answers today'], [td.n ? Math.round(100 * td.ok / td.n) + '<small>%</small>' : '–', 'Right today'], [totalDue, 'Reviews due']]
      .map(([v, l]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('')}</div>`;
  if (S.session) {
    const lvl = S.session.level === 'x' ? 'mixed levels' : 'HSK ' + S.session.level;
    html += `<div class="card hl" style="margin:16px 0 0"><div class="row"><div class="grow"><b>Unfinished: ${esc(S.session.title)}</b><div class="small mute">${lvl} · question ${S.session.pos + 1} of ${S.session.q.length}</div></div><button class="pri" data-a="resume">Resume</button></div></div>`;
  }
  // 9 + 3 row: the levels, then the exam calendar and the cross-level review
  html += `<div class="g12"><section class="panel span9" aria-labelledby="h-levels"><div class="panel-head"><h2 id="h-levels">Your levels</h2><span class="small mute">next characters to learn in each level</span></div><div class="lvrows">`;
  for (const n of LEVELS) {
    const L = LV[n], p = plans[n], st = p.st, [stTxt, stCls] = STATUS_TXT[p.status] || ['', ''];
    const nextC = L.C.filter(c => status(c) === 'new').slice(0, 6).map(c => c.h).join('');
    html += `<button class="lvrow" data-a="level" data-n="${n}">
      <span class="lvn">HSK ${n}<small>${n === 1 || n === 4 || n === 5 ? 'HSK 2.0' : 'New HSK'}</small></span>
      <span class="lvnext zh">${nextC || '—'}<span>${nextC ? 'next to learn' : 'all characters studied'}</span></span>
      <span><span class="lvcount"><b>${st.wSeen}</b> / ${L.W.length} words · <b>${st.cSeen}</b> / ${L.C.length} characters</span>${bar(st.wSeen + st.cSeen, st.words + st.chars)}</span>
      <span class="lvstate">${chip(stTxt || 'In progress', stCls)}<span class="small">${st.due ? `${st.due} due today` : 'nothing due'}</span></span></button>`;
  }
  html += `</div></section><aside class="span3"><section class="panel" aria-labelledby="h-exams"><div class="panel-head"><h2 id="h-exams">Exams</h2></div>`;
  const dated = LEVELS.filter(n => LS(n).examDate);
  html += dated.length ? `<div class="examlist">${dated.map(n => `<div class="examrow"><b>HSK ${n}</b><span class="d">${plans[n].days >= 0 ? `<b>${plans[n].days} day${plans[n].days === 1 ? '' : 's'}</b>` : '<b>passed</b>'}${fmtShort(LS(n).examDate)}</span></div>`).join('')}</div>`
    : `<p class="small mute" style="margin:0">No exam dates yet. Set one in a level's Exam prep to get a daily pace.</p>`;
  const anyStudied = LEVELS.some(n => studiedW(n).length || studiedC(n).length);
  html += `</section><section class="panel" style="margin-top:16px" aria-labelledby="h-xr"><div class="panel-head"><h2 id="h-xr">Mixed review</h2></div>
    <p class="small mute" style="margin:0 0 12px">Due items from every level you have studied. Level sessions and mock exams never mix levels.</p>
    <button data-a="xreview" ${anyStudied ? '' : 'disabled'}>Start mixed review</button></section></aside></div>`;
  html += `<p class="keys">Keys: <span class="kbd">1</span>–<span class="kbd">4</span> choose · <span class="kbd">Enter</span> submit / next · <span class="kbd">Space</span> flip · <span class="kbd">L</span> listen · <span class="kbd">S</span> star · <span class="kbd">Esc</span> back</p>`;
  return html;
}

/* ---------------- settings ---------------- */
function vSettings() {
  return hdr('Settings', 'home') + `<div class="card"><h2>${IC.sound} Audio</h2>${ZH
      ? `<div class="mute small">Using the voice “${esc(ZH.name)}”. Listening questions are mixed into exercises and mock exams.</div>
         <label class="toggle"><input type="checkbox" data-change="autosp" ${S.autoSpeak ? 'checked' : ''}> Speak each word automatically after I answer</label>
         <label class="small mute" for="rate">Speed</label><select class="txt" id="rate" data-change="rate" style="max-width:220px">${[[.6, 'Slow'], [.85, 'Normal'], [1, 'Natural']].map(([v, l]) => `<option value="${v}" ${+S.rate === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
         <div class="sp"></div><button class="sm" data-a="say" data-t="你好，祝你考试顺利！">Test the voice</button>`
      : `<div class="mute small">No Chinese voice was found on this device, so listen buttons and listening questions are hidden. On Windows: Settings → Time &amp; language → Speech → Add voices → Chinese (Simplified, China), then reopen this page. Phones usually have one built in.</div>`}</div>
    <div class="card"><h2>Backup</h2><div class="mute small">All progress for all six levels is saved in this browser only. Export a JSON file to back it up or move it to another device.</div><div class="sp"></div>
      <div class="row"><button data-a="export">Export progress</button><button data-a="import">Import progress</button><button class="ghost" data-a="reset" style="color:var(--bad)">Reset everything</button></div><input type="file" id="imp" accept=".json,application/json" hidden>
      <div id="io"></div></div>
    <div class="card"><h2>About the data</h2><div class="small mute">${LEVELS.map(n => `<div style="margin:4px 0"><b style="color:var(--ink)">HSK ${n}</b> — ${LV[n].W.length} words, ${LV[n].C.length} characters · ${esc(LV[n].meta.syllabus)} · source: ${esc(LV[n].meta.source)} · ranking: ${esc(LV[n].meta.ranking)}</div>`).join('')}
      <div style="margin-top:8px">Character meanings and components: CC-CEDICT (CC BY-SA 4.0) and the hanzipy decomposition data; character frequency: Jun Da's corpus list. Example sentences were written for this app using only vocabulary from the same level or below.</div></div></div>`;
}
