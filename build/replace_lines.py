"""Replace lines in a 'key|...' file with the lines of a patch file that share the same key.
usage: replace_lines.py <target.txt> <patch.txt>"""
import sys
target, patch = sys.argv[1], sys.argv[2]
rep = {}
for line in open(patch, encoding="utf-8-sig"):
    if line.strip():
        rep[line.split("|", 1)[0].strip()] = line.rstrip("\n")
out, done = [], set()
for line in open(target, encoding="utf-8-sig"):
    k = line.split("|", 1)[0].strip()
    if k in rep:
        out.append(rep[k]); done.add(k)
    elif line.strip():
        out.append(line.rstrip("\n"))
open(target, "w", encoding="utf-8").write("\n".join(out) + "\n")
missing = set(rep) - done
print(f"{target}: replaced {len(done)}" + (f", keys not found: {sorted(missing)}" if missing else ""))
