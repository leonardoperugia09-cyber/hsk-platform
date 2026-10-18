// Pasted into the page console (window.__t) to exercise the pinyin / meaning checkers.
(() => {
  const t = window.__t, w = h => t.W.find(x => x.h === h), cp = (h, s) => t.checkPinyin(s, w(h)).res;
  const P = [
    ['热爱', 're4ai4', 'ok'], ['热爱', "rè'ài", 'ok'], ['热爱', 'RE4 AI4', 'ok'], ['热爱', 'reai4', 'almost'], ['热爱', 'rèài', 'ok'],
    ['干活儿', 'gan4huo2r', 'ok'], ['干活儿', 'gan4huor2', 'ok'], ['干活儿', 'gan4 huo2 er', 'ok'], ['干活儿', 'gànhuór', 'ok'], ['干活儿', 'ganhuor', 'almost'], ['干活儿', 'gan4huo2', 'wrong'],
    ['使劲儿', 'shi3jin4r', 'ok'], ['使劲儿', 'shi3jinr4', 'ok'], ['使劲儿', 'shǐjìner', 'ok'], ['使劲儿', 'shi2jin4r', 'almost'],
    ['背', 'bei4', 'ok'], ['背', 'bēi', 'ok'], ['背', 'bei3', 'almost'], ['圈', 'juan4', 'ok'], ['圈', 'quan1', 'ok'], ['圈', 'juān', 'ok'],
    ['血', 'xie3', 'ok'], ['血', 'xue4', 'ok'], ['数', 'shu4', 'ok'], ['数', 'shu3', 'ok'], ['系', 'ji4', 'ok'], ['涨', 'zhang4', 'ok'], ['吐', 'tu3', 'ok'], ['划', 'hua4', 'ok'], ['冲', 'chong4', 'ok'],
    ['妇女', 'fu4nv3', 'ok'], ['妇女', 'fu4nu:3', 'ok'], ['妇女', 'fùnǚ', 'ok'], ['妇女', 'fu4nü3', 'ok'], ['妇女', 'fu4nu3', 'wrong'],
    ['纪律', 'ji4lv4', 'ok'], ['纪律', 'jìlǜ', 'ok'], ['省略', 'sheng3lve4', 'ok'], ['省略', 'shěnglüè', 'ok'], ['省略', 'sheng3lu:e4', 'ok'],
    ['娱乐', 'yv2le4', 'ok'], ['娱乐', 'yu2le4', 'ok'], ['女士', 'nv3shi4', 'ok'], ['女士', 'NÜ3SHI4', 'ok'],
    ['被子', 'bei4zi', 'ok'], ['被子', 'bei4zi5', 'ok'], ['被子', 'bei4zi0', 'ok'], ['被子', 'bei4zi3', 'almost'], ['被子', 'bèi zi', 'ok'],
    ['玻璃', 'bo1li', 'ok'], ['玻璃', 'bo1li2', 'ok'], ['豆腐', 'dou4fu', 'ok'], ['脑袋', 'nao3dai', 'ok'], ['脑袋', 'nao3dai4', 'ok'],
    ['一辈子', 'yi1bei4zi', 'ok'], ['一辈子', 'yi2bei4zi', 'ok'], ['不断', 'bu4duan4', 'ok'], ['不断', 'bu2duan4', 'ok'], ['不见得', 'bu4jian4de2', 'ok'], ['不见得', 'bu2jian4de', 'ok'],
    ['嗯', 'en', 'ok'], ['嗯', 'ng4', 'ok'], ['嗯', 'ǹg', 'ok'], ['欧洲', 'Ou1zhou1', 'ok'], ['方案', 'fang1an4', 'ok'], ['方案', "fāng'àn", 'ok'],
    ['会计', 'kuai4ji4', 'ok'], ['会计', 'hui4ji4', 'wrong'], ['贡献', 'gòngxiàn', 'ok'], ['贡献', 'gong4 xian4', 'ok'], ['贡献', 'gong xian', 'almost'],
    ['恢复', 'hūifù', 'ok'], ['恢复', 'hui1fu4', 'ok'], ['流泪', 'liu2lei4', 'ok'], ['流泪', 'liú lèi', 'ok'], ['贡献', '', 'wrong'], ['贡献', '1234', 'wrong'],
    ['名胜古迹', 'ming2sheng4gu3ji4', 'ok'], ['讨价还价', 'tao3jia4huan2jia4', 'ok'], ['动画片', 'dong4hua4pian1', 'ok'], ['下载', 'xia4zai3', 'ok'], ['似的', 'shi4de', 'ok'],
  ];
  const fails = P.filter(([h, s, e]) => cp(h, s) !== e).map(([h, s, e]) => `${h} "${s}" expected ${e} got ${cp(h, s)}`);
  const M = [['安慰', 'to comfort', true], ['岸', 'The Shore', true], ['安慰', 'console, cheer up', true], ['岸', 'banana', false], ['当心', 'be careful', true], ['当心', 'careful', true],
    ['乖', 'well behaved', true], ['管子', 'a pipe', true], ['便', 'then', true], ['朝', 'towards', true], ['装', 'pretend', true], ['数', 'To Count', true], ['方', 'square', true], ['布', 'cloth', true],
    ['吹', 'to boast', true], ['呆', 'stay', true], ['至于', 'as for', true], ['则', 'then', true], ['兔子', 'rabbit', true], ['方式', 'method', true], ['古代', '', false]];
  const mf = M.filter(([h, s, e]) => t.checkMeaning(s, w(h)) !== e).map(([h, s, e]) => `${h} "${s}" expected ${e}`);
  // every word: its own pinyin, numeric round trip, distractors, question generation
  let gen = 0; const gf = [];
  for (const x of t.W) {
    if (t.checkPinyin(x.p, x).res !== 'ok') gf.push('self ' + x.h);
    if (t.checkPinyin(x.s, x).res !== 'ok') gf.push('spaced ' + x.h);
    if (!t.checkMeaning(x.a[0], x)) gf.push('acc ' + x.h);
    if (x.z.split(x.h).length !== 2) gf.push('cloze ' + x.h);
    for (const type of ['h2m', 'm2h', 'cloze', 'h2p', 'type']) {
      const q = t.gen({k: '5:' + x.i, type}); gen++;
      if (q.mode === 'mc' && (q.opts.length !== 4 || new Set(q.opts).size !== 4 || q.ans < 0)) gf.push(type + ' ' + x.h + ' ' + JSON.stringify(q.opts));
    }
  }
  for (const x of t.H4) { const q = t.gen({k: '4:' + x.h, type: 'h2m'}); if (q.opts.length !== 4 || new Set(q.opts).size !== 4) gf.push('h4 ' + x.h); }
  const show = h => t.distract(w(h), 'm2h').map(x => x.h).join(' ');
  return JSON.stringify({pinyinCases: P.length, pinyinFails: fails, meaningCases: M.length, meaningFails: mf, generated: gen, genFails: gf.slice(0, 30), genFailCount: gf.length,
    m2h: ['权力', '反应', '记录', '制定', '报道', '形式'].map(h => h + ' → ' + show(h)),
    h2m: ['立即', '便'].map(h => t.distract(w(h), 'h2m').map(x => x.h + '=' + x.e).join(' | ')),
    h2p: ['热爱', '背', '干活儿', '省略', '被子'].map(h => h + ' → ' + t.pinyinDistractors(w(h)).join(', ')),
    today: t.today(), unlocked: t.unlocked(), cur: t.currentDay()}, null, 1);
})()
