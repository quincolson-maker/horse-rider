#!/usr/bin/env python3
"""Cache-bust a release: give every relative ES-module import (main.js, src/, addons/) and the main.js <script> in index.html
the same ?v=<version>, so browsers fetch the new files after an update instead of a stale cached copy (GitHub Pages caches 10 min).
Usage: python3 tools/stamp.py <version>"""
import re, sys, pathlib
ver = sys.argv[1]; root = pathlib.Path(__file__).resolve().parent.parent
pat = re.compile(r"""((?:from|import)\s*\(?\s*['"])(\.{1,2}/[^'"?]+?\.js)(?:\?v=[^'"]*)?(['"])""")
files = [root / 'main.js', *sorted((root / 'src').glob('*.js')), *sorted((root / 'addons').rglob('*.js'))]
n = 0
for f in files:
    s = f.read_text(); t = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(3)}", s)
    if t != s: f.write_text(t); n += 1
h = root / 'index.html'; s = h.read_text(); t = re.sub(r'src="\./main\.js(?:\?v=[^"]*)?"', f'src="./main.js?v={ver}"', s); h.write_text(t)
print(f"stamped {n} modules + index.html with v={ver}")
