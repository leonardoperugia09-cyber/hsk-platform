"""Dev only: write .taste-skill/screens/<name>.html — copies of index.html that open on one screen with
sample progress, so the design inspector can photograph each screen. Never shipped.
usage: make_screens.py <index.html> <out_dir>"""
import os, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
html = open(src, encoding="utf-8").read()

SEED = """
(function(){ const t = window.__t; t.S = t.fresh(); t.S.theme = 'light';
  const L = t.LV[3], n = 3;
  L.W.slice(0, 140).forEach((w, i) => t.record(w, i % 7 !== 0, 'h2m', 'x', w.e, 's' + (i % 5), 'Batch 1'));
  L.C.slice(0, 60).forEach((c, i) => t.record(c, i % 9 !== 0, 'h2m', 'x', c.e, 's' + (i % 3), 'Characters'));
  t.S.levels[3].groups['1-0'] = {learned: true, done: true, right: 36, total: 40, missed: []};
  t.S.levels[3].examDate = new Date(Date.now() + 26 * 864e5).toISOString().slice(0, 10);
  t.S.levels[3].mocks = [{d: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), t: 0, score: 58, pass: false, secs: {vocab: [7, 12], cloze: [9, 15], tr: [6, 10], write: [3, 6], pinyin: [4, 6]}, dur: 1800, n: 49}];
  L.W.slice(0, 50).forEach(w => t.record(w, true, 'cloze', 'x', w.h, 'sX', 'Batch 1'));
  t.LV[5].W.slice(0, 220).forEach((w, i) => t.record(w, i % 5 !== 0, 'type', 'x', w.p, 's' + (i % 4), 'Batch 1'));
  t.S.levels[5].examDate = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10);
  t.save();
  __GO__
})();
"""
SCREENS = {
    "home": "t.go('home');",
    "overview": "t.go('level', {n: 3, tab: 'overview'});",
    "quiz": "t.go('batch', {n: 3, d: 1}); t.startGroup ? 0 : 0; document.querySelector('[data-a=ex][data-g=\"1\"]').click(); const s = t.S.session; s.q[0].type = 'cloze'; s.cur = null; t.go('quiz');",
    "mock": "t.go('level', {n: 3, tab: 'mock'}); document.querySelector('[data-a=mockstart]').click(); const s = t.S.session; s.pos = 3; t.go('quiz');",
}
for name, go in SCREENS.items():
    page = html.replace("</body>", "<script>" + SEED.replace("__GO__", go) + "</script></body>")
    open(os.path.join(out, f"{name}.html"), "w", encoding="utf-8").write(page)
print("wrote", list(SCREENS))
